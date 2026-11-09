<?php

namespace App\Database;

use PDO;
use PDOException;
use RuntimeException;

class MySQL
{
    private static ?MySQL $instance = null;
    private ?PDO $pdo = null;
    private array $config;

    private function __construct(?array $customConfig = null)
    {
        if ($customConfig !== null) {
            $this->config = $customConfig;
        } else {
            $baseDir = class_exists(\App\Utils\AppRoot::class)
                ? \App\Utils\AppRoot::get()
                : dirname(__DIR__, 2);
            $configFile = $baseDir . '/config/database.php';
            if (file_exists($configFile)) {
                $allConfig = require $configFile;
                $default = $allConfig['default'] ?? (getenv('DB_HOST') ? 'mysql' : 'sqlite');
                $this->config = $allConfig['connections'][$default] ?? [];
            } else {
                $this->config = [
                    'driver' => 'sqlite',
                    'database' => $baseDir . '/storage/database/elkarooz.sqlite',
                ];
            }
        }
    }

    public static function getInstance(?array $config = null): MySQL
    {
        if (self::$instance === null) {
            self::$instance = new self($config);
        }
        return self::$instance;
    }

    public static function setInstance(?MySQL $instance): void
    {
        self::$instance = $instance;
    }

    public function getConnection(): PDO
    {
        if ($this->pdo === null) {
            $this->connect();
        }
        return $this->pdo;
    }

    public function getDriver(): string
    {
        return (string)($this->config['driver'] ?? (isset($this->config['host']) ? 'mysql' : 'sqlite'));
    }

    private function connect(): void
    {
        $driver = $this->getDriver();
        if ($driver === 'sqlite') {
            $baseDir = class_exists(\App\Utils\AppRoot::class)
                ? \App\Utils\AppRoot::get()
                : dirname(__DIR__, 2);
            $dbPath = $this->config['database'] ?? ($baseDir . '/storage/database/elkarooz.sqlite');
            $dsn = 'sqlite:' . $dbPath;
            $options = $this->config['options'] ?? [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];
            try {
                $this->pdo = new PDO($dsn, null, null, $options);
                $this->pdo->exec('PRAGMA foreign_keys = ON;');
                return;
            } catch (PDOException $e) {
                error_log('[Database] SQLite connection failure: ' . $e->getMessage());
                throw new RuntimeException('فشل الاتصال بقاعدة البيانات المحلية', (int)$e->getCode(), $e);
            }
        }

        $host = $this->config['host'] ?? '127.0.0.1';
        $port = $this->config['port'] ?? 3306;
        $db = $this->config['database'] ?? 'elkarooz_school';
        $user = $this->config['username'] ?? 'root';
        $pass = $this->config['password'] ?? '';
        $charset = $this->config['charset'] ?? 'utf8mb4';

        $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $host, $port, $db, $charset);

        $options = $this->config['options'] ?? [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_PERSISTENT => false,
            (defined('PDO::MYSQL_ATTR_INIT_COMMAND') ? PDO::MYSQL_ATTR_INIT_COMMAND : 1002) => 'SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci',
        ];

        try {
            $this->pdo = new PDO($dsn, $user, $pass, $options);
        } catch (PDOException $e) {
            error_log('[MySQL] Connection failure: ' . $e->getMessage());
            throw new RuntimeException('فشل الاتصال بقاعدة بيانات MySQL', (int)$e->getCode(), $e);
        }
    }

    public function isConnected(): bool
    {
        try {
            $pdo = $this->getConnection();
            return (bool)$pdo->query('SELECT 1');
        } catch (\Throwable $e) {
            return false;
        }
    }

    public function query(string $sql, array $params = []): \PDOStatement
    {
        $stmt = $this->getConnection()->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    }

    public function execute(string $sql, array $params = []): int
    {
        $stmt = $this->query($sql, $params);
        return $stmt->rowCount();
    }

    public function fetchOne(string $sql, array $params = []): ?array
    {
        $stmt = $this->query($sql, $params);
        $res = $stmt->fetch();
        return $res === false ? null : $res;
    }

    public function fetchAll(string $sql, array $params = []): array
    {
        $stmt = $this->query($sql, $params);
        return $stmt->fetchAll();
    }

    private function assertValidIdentifier(string $identifier): string
    {
        if (!preg_match('/^[a-zA-Z_][a-zA-Z0-9_]*$/', $identifier)) {
            throw new \InvalidArgumentException('معرف عمود أو جدول غير صالح');
        }
        return $identifier;
    }

    public function insert(string $table, array $data): int
    {
        $table = $this->assertValidIdentifier($table);
        if ($data === []) {
            throw new \InvalidArgumentException('لا توجد أعمدة للإدخال');
        }
        $columns = array_map(fn($col) => $this->assertValidIdentifier((string)$col), array_keys($data));
        $fields = '`' . implode('`, `', $columns) . '`';
        $placeholders = ':' . implode(', :', $columns);

        $sql = sprintf('INSERT INTO `%s` (%s) VALUES (%s)', $table, $fields, $placeholders);
        $stmt = $this->getConnection()->prepare($sql);
        $stmt->execute($data);

        return $stmt->rowCount();
    }

    public function update(string $table, array $data, string $where, array $whereParams = []): int
    {
        $table = $this->assertValidIdentifier($table);
        if ($data === []) {
            return 0;
        }
        $setClauses = [];
        $params = [];

        foreach ($data as $col => $val) {
            $safeCol = $this->assertValidIdentifier((string)$col);
            $setClauses[] = sprintf('`%s` = :set_%s', $safeCol, $safeCol);
            $params['set_' . $safeCol] = $val;
        }

        $sql = sprintf('UPDATE `%s` SET %s WHERE %s', $table, implode(', ', $setClauses), $where);
        $allParams = array_merge($params, $whereParams);

        $stmt = $this->getConnection()->prepare($sql);
        $stmt->execute($allParams);

        return $stmt->rowCount();
    }

    public function delete(string $table, string $where, array $whereParams = []): int
    {
        $table = $this->assertValidIdentifier($table);
        $sql = sprintf('DELETE FROM `%s` WHERE %s', $table, $where);
        $stmt = $this->getConnection()->prepare($sql);
        $stmt->execute($whereParams);

        return $stmt->rowCount();
    }

    public function beginTransaction(): bool
    {
        return $this->getConnection()->beginTransaction();
    }

    public function commit(): bool
    {
        return $this->getConnection()->commit();
    }

    public function rollBack(): bool
    {
        if ($this->getConnection()->inTransaction()) {
            return $this->getConnection()->rollBack();
        }
        return false;
    }

    public function inTransaction(): bool
    {
        return $this->getConnection()->inTransaction();
    }

    public function lastInsertId(): string
    {
        return $this->getConnection()->lastInsertId();
    }
}
