<?php

namespace App\Auth;

use App\Database\MySQL;
use Firebase\JWT\JWT;
use RuntimeException;
use InvalidArgumentException;

class MySQLAuthService
{
    private MySQL $db;
    private array $config;

    public function __construct(?MySQL $db = null, ?array $config = null)
    {
        $this->db = $db ?? MySQL::getInstance();
        if ($config !== null) {
            $this->config = $config;
        } else {
            $baseDir = class_exists(\App\Utils\AppRoot::class)
                ? \App\Utils\AppRoot::get()
                : dirname(__DIR__, 2);
            $configFile = $baseDir . '/config/database.php';
            $allConfig = file_exists($configFile) ? require $configFile : [];
            $this->config = $allConfig['jwt'] ?? [
                'secret' => getenv('SUPABASE_JWT_SECRET') ?: getenv('JWT_SECRET') ?: '',
                'algorithm' => 'HS256',
                'access_token_ttl' => 3600,
                'refresh_token_ttl' => 30 * 86400,
                'issuer' => getenv('APP_URL') ?: 'https://elkaroozschool.is-best.net',
                'audience' => 'authenticated',
            ];
        }
    }

    public static function generateUuid(): string
    {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40); // set version to 0100 (UUIDv4)
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80); // set bits 6-7 to 10
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }

    public function login(string $identifier, string $password, ?string $ip = null, ?string $userAgent = null): array
    {
        $cleanId = trim(mb_strtolower($identifier));
        if ($cleanId === '') {
            throw new InvalidArgumentException('اسم المستخدم أو البريد الإلكتروني مطلوب');
        }

        // Fetch user from auth_users
        $user = $this->db->fetchOne(
            'SELECT * FROM auth_users WHERE (LOWER(username) = :id1 OR LOWER(email) = :id2) AND deleted_at IS NULL LIMIT 1',
            ['id1' => $cleanId, 'id2' => $cleanId]
        );

        if (!$user) {
            throw new RuntimeException('بيانات الدخول غير صحيحة');
        }

        // Check account lock
        if ($user['locked_until'] !== null) {
            $lockedUntil = strtotime($user['locked_until']);
            if ($lockedUntil > time()) {
                $waitSec = $lockedUntil - time();
                throw new RuntimeException("الحساب مقفل مؤقتاً بسبب تكرار المحاولات الخاطئة. يرجى المحاولة بعد {$waitSec} ثانية.");
            }
        }

        // Check if active
        if ((int)$user['is_active'] !== 1) {
            throw new RuntimeException('هذا الحساب موقوف، يرجى مراجعة إدارة المدرسة.');
        }

        // Verify password
        if (!password_verify($password, $user['password_hash'])) {
            $failed = (int)$user['failed_login_attempts'] + 1;
            $lockedUntil = null;
            if ($failed >= 5) {
                $lockedUntil = date('Y-m-d H:i:s', time() + 60); // 60s lockout
            }

            $this->db->update(
                'auth_users',
                ['failed_login_attempts' => $failed, 'locked_until' => $lockedUntil],
                'id = :uid',
                ['uid' => $user['id']]
            );

            $remaining = max(0, 5 - $failed);
            if ($remaining > 0) {
                throw new RuntimeException("كلمة المرور غير صحيحة. متبقي {$remaining} محاولات.");
            } else {
                throw new RuntimeException('تم قفل الحساب مؤقتاً لمدة دقيقة بسبب تكرار المحاولات الخاطئة.');
            }
        }

        // Reset lockout on success & record last sign in
        $this->db->update(
            'auth_users',
            [
                'failed_login_attempts' => 0,
                'locked_until' => null,
                'last_sign_in_at' => date('Y-m-d H:i:s'),
            ],
            'id = :uid',
            ['uid' => $user['id']]
        );

        // Fetch profile
        $profile = $this->db->fetchOne(
            'SELECT * FROM profiles WHERE id = :pid LIMIT 1',
            ['pid' => $user['id']]
        );

        // Generate Tokens
        $accessToken = $this->mintAccessToken($user, $profile);
        $refreshToken = $this->createRefreshToken($user['id'], $ip, $userAgent);

        return [
            'access_token' => $accessToken,
            'token_type' => 'bearer',
            'expires_in' => $this->config['access_token_ttl'],
            'refresh_token' => $refreshToken,
            'user' => [
                'id' => $user['id'],
                'email' => $user['email'],
                'username' => $user['username'],
                'role' => $user['role'],
                'group_id' => $user['group_id'],
                'full_name' => $profile['full_name'] ?? $user['username'],
                'avatar_url' => $profile['avatar_url'] ?? null,
            ],
        ];
    }

    public function refresh(string $refreshToken, ?string $ip = null, ?string $userAgent = null): array
    {
        $tokenHash = hash('sha256', $refreshToken);
        $record = $this->db->fetchOne(
            'SELECT * FROM auth_refresh_tokens WHERE token_hash = :th AND revoked_at IS NULL LIMIT 1',
            ['th' => $tokenHash]
        );

        if (!$record) {
            throw new RuntimeException('رمز التحديث غير صالح أو منتهي الصلاحية');
        }

        if (strtotime($record['expires_at']) < time()) {
            throw new RuntimeException('انتهت صلاحية جلسة التحديث. يرجى تسجيل الدخول مجدداً.');
        }

        // Revoke the old token (rotation)
        $this->db->update(
            'auth_refresh_tokens',
            ['revoked_at' => date('Y-m-d H:i:s')],
            'id = :tid',
            ['tid' => $record['id']]
        );

        $user = $this->db->fetchOne(
            'SELECT * FROM auth_users WHERE id = :uid AND deleted_at IS NULL AND is_active = 1 LIMIT 1',
            ['uid' => $record['user_id']]
        );

        if (!$user) {
            throw new RuntimeException('المستخدم غير موجود أو تم إيقاف حسابه');
        }

        $profile = $this->db->fetchOne('SELECT * FROM profiles WHERE id = :pid LIMIT 1', ['pid' => $user['id']]);

        $newAccessToken = $this->mintAccessToken($user, $profile);
        $newRefreshToken = $this->createRefreshToken($user['id'], $ip, $userAgent);

        return [
            'access_token' => $newAccessToken,
            'token_type' => 'bearer',
            'expires_in' => $this->config['access_token_ttl'],
            'refresh_token' => $newRefreshToken,
            'user' => [
                'id' => $user['id'],
                'email' => $user['email'],
                'username' => $user['username'],
                'role' => $user['role'],
                'group_id' => $user['group_id'],
                'full_name' => $profile['full_name'] ?? $user['username'],
            ],
        ];
    }

    public function logout(string $refreshToken): bool
    {
        $tokenHash = hash('sha256', $refreshToken);
        $affected = $this->db->update(
            'auth_refresh_tokens',
            ['revoked_at' => date('Y-m-d H:i:s')],
            'token_hash = :th AND revoked_at IS NULL',
            ['th' => $tokenHash]
        );
        return $affected > 0;
    }

    public function register(array $data): array
    {
        $username = trim($data['username'] ?? '');
        $email = trim(mb_strtolower($data['email'] ?? ''));
        $password = $data['password'] ?? '';
        $fullName = trim($data['full_name'] ?? $username);
        $role = $data['role'] ?? 'trainee';
        $groupId = !empty($data['group_id']) ? (int)$data['group_id'] : null;

        if ($username === '' || strlen($password) < 6) {
            throw new InvalidArgumentException('اسم المستخدم مطلوب وكلمة المرور يجب ألا تقل عن 6 أحرف');
        }

        if ($email === '') {
            $email = strtolower($username) . '@elkarooz-school.com';
        }

        // Check duplicates
        $existing = $this->db->fetchOne(
            'SELECT id FROM auth_users WHERE username = :u OR email = :e LIMIT 1',
            ['u' => $username, 'e' => $email]
        );
        if ($existing) {
            throw new RuntimeException('اسم المستخدم أو البريد الإلكتروني مسجل مسبقاً');
        }

        $userId = self::generateUuid();
        $passwordHash = password_hash($password, PASSWORD_BCRYPT);

        $this->db->beginTransaction();
        try {
            $this->db->insert('auth_users', [
                'id' => $userId,
                'email' => $email,
                'username' => $username,
                'password_hash' => $passwordHash,
                'role' => $role,
                'group_id' => $groupId,
                'is_active' => 1,
                'email_confirmed_at' => date('Y-m-d H:i:s'),
                'created_at' => date('Y-m-d H:i:s'),
            ]);

            $this->db->insert('profiles', [
                'id' => $userId,
                'username' => $username,
                'full_name' => $fullName,
                'role_id' => $role,
                'group_id' => $groupId,
                'phone' => $data['phone'] ?? null,
                'address' => $data['address'] ?? null,
                'birth_date' => $data['birth_date'] ?? null,
                'confession_father' => $data['confession_father'] ?? null,
                'account_status' => 'ACTIVE',
                'created_at' => date('Y-m-d H:i:s'),
            ]);

            $this->db->commit();
        } catch (\Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }

        return [
            'id' => $userId,
            'username' => $username,
            'email' => $email,
            'full_name' => $fullName,
            'role' => $role,
            'group_id' => $groupId,
        ];
    }

    public function changePassword(string $userId, string $oldPassword, string $newPassword): bool
    {
        if (strlen($newPassword) < 6) {
            throw new InvalidArgumentException('كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف');
        }

        $user = $this->db->fetchOne('SELECT * FROM auth_users WHERE id = :uid LIMIT 1', ['uid' => $userId]);
        if (!$user) {
            throw new RuntimeException('المستخدم غير موجود');
        }

        if (!password_verify($oldPassword, $user['password_hash'])) {
            throw new RuntimeException('كلمة المرور الحالية غير صحيحة');
        }

        $newHash = password_hash($newPassword, PASSWORD_BCRYPT);
        $this->db->update(
            'auth_users',
            ['password_hash' => $newHash, 'updated_at' => date('Y-m-d H:i:s')],
            'id = :uid',
            ['uid' => $userId]
        );

        // Invalidate all refresh tokens for security
        $this->db->update(
            'auth_refresh_tokens',
            ['revoked_at' => date('Y-m-d H:i:s')],
            'user_id = :uid AND revoked_at IS NULL',
            ['uid' => $userId]
        );

        return true;
    }

    private function mintAccessToken(array $user, ?array $profile): string
    {
        $now = time();
        $ttl = (int)($this->config['access_token_ttl'] ?? 3600);
        $secret = trim((string)($this->config['secret'] ?? ''));
        if ($secret === '' || strlen($secret) < 32 || preg_match('#^https?://#i', $secret) === 1) {
            throw new RuntimeException('JWT secret is not configured or does not meet minimum security requirements');
        }
        $alg = (string)($this->config['algorithm'] ?? 'HS256');

        $role = $user['role'] ?? 'trainee';
        $groupId = $user['group_id'] ?? null;
        $fullName = $profile['full_name'] ?? $user['username'];

        $payload = [
            'iss' => $this->config['issuer'] ?? 'https://elkaroozschool.is-best.net',
            'sub' => $user['id'],
            'aud' => $this->config['audience'] ?? 'authenticated',
            'iat' => $now,
            'exp' => $now + $ttl,
            'email' => $user['email'],
            'phone' => $profile['phone'] ?? '',
            'app_metadata' => [
                'provider' => 'mysql_native',
                'providers' => ['mysql_native'],
                'role' => $role,
                'group_id' => $groupId,
                'is_active' => true,
            ],
            'user_metadata' => [
                'username' => $user['username'],
                'full_name' => $fullName,
                'role' => $role,
                'group_id' => $groupId,
            ],
            'role' => $role,
        ];

        return JWT::encode($payload, $secret, $alg);
    }

    private function createRefreshToken(string $userId, ?string $ip = null, ?string $userAgent = null): string
    {
        $rawToken = bin2hex(random_bytes(32));
        $tokenHash = hash('sha256', $rawToken);
        $ttl = (int)($this->config['refresh_token_ttl'] ?? (30 * 86400));
        $expiresAt = date('Y-m-d H:i:s', time() + $ttl);

        $this->db->insert('auth_refresh_tokens', [
            'id' => self::generateUuid(),
            'user_id' => $userId,
            'token_hash' => $tokenHash,
            'ip_address' => $ip,
            'user_agent' => $userAgent ? mb_substr($userAgent, 0, 500) : null,
            'expires_at' => $expiresAt,
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        return $rawToken;
    }
}
