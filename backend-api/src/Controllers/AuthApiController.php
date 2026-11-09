<?php

namespace App\Controllers;

use App\Auth\MySQLAuthService;
use App\Utils\Response;
use App\Utils\ClientIp;
use RuntimeException;
use InvalidArgumentException;

class AuthApiController
{
    private MySQLAuthService $authService;

    public function __construct(?MySQLAuthService $authService = null)
    {
        $this->authService = $authService ?? new MySQLAuthService();
    }

    public function login(): void
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $identifier = $input['username'] ?? $input['email'] ?? '';
        $password = $input['password'] ?? '';
        $ip = ClientIp::resolve();
        $ua = $_SERVER['HTTP_USER_AGENT'] ?? null;

        try {
            $result = $this->authService->login($identifier, $password, $ip, $ua);
            Response::success($result, 'تم تسجيل الدخول بنجاح');
        } catch (InvalidArgumentException $e) {
            Response::error($e->getMessage(), 'VALIDATION_ERROR', 400);
        } catch (RuntimeException $e) {
            $msg = $e->getMessage();
            $code = str_contains($msg, 'مقفل') ? 'ACCOUNT_LOCKED' : 'INVALID_CREDENTIALS';
            $status = str_contains($msg, 'مقفل') ? 429 : 401;
            Response::error($msg, $code, $status);
        } catch (\Throwable $e) {
            error_log('[AuthApiController::login] Exception: ' . $e->getMessage());
            Response::error('حدث خطأ أثناء معالجة تسجيل الدخول', 'INTERNAL_ERROR', 500);
        }
    }

    public function refresh(): void
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $refreshToken = $input['refresh_token'] ?? '';
        $ip = ClientIp::resolve();
        $ua = $_SERVER['HTTP_USER_AGENT'] ?? null;

        if (!$refreshToken) {
            Response::error('رمز التحديث (refresh_token) مطلوب', 'VALIDATION_ERROR', 400);
            return;
        }

        try {
            $result = $this->authService->refresh($refreshToken, $ip, $ua);
            Response::success($result, 'تم تحديث الجلسة بنجاح');
        } catch (RuntimeException $e) {
            Response::error($e->getMessage(), 'UNAUTHORIZED', 401);
        } catch (\Throwable $e) {
            error_log('[AuthApiController::refresh] Exception: ' . $e->getMessage());
            Response::error('فشل تحديث الجلسة', 'INTERNAL_ERROR', 500);
        }
    }

    public function logout(): void
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $refreshToken = $input['refresh_token'] ?? '';

        if ($refreshToken) {
            $this->authService->logout($refreshToken);
        }

        Response::success(null, 'تم تسجيل الخروج بنجاح');
    }

    public function me(array $claims): void
    {
        $userId = $claims['user_id'] ?? ($claims['sub'] ?? null);
        if (!$userId) {
            Response::error('المستخدم غير مصادق عليه', 'UNAUTHORIZED', 401);
            return;
        }

        $db = \App\Database\MySQL::getInstance();
        $profile = $db->fetchOne(
            'SELECT p.*, r.name_ar as role_name, g.name_ar as group_name
             FROM profiles p
             LEFT JOIN roles r ON r.id = p.role_id
             LEFT JOIN `groups` g ON g.id = p.group_id
             WHERE p.id = :id AND p.deleted_at IS NULL LIMIT 1',
            ['id' => $userId]
        );

        if (!$profile) {
            Response::error('الملف الشخصي غير موجود', 'NOT_FOUND', 404);
            return;
        }

        Response::success(['profile' => $profile], 'بيانات الحساب الحالي');
    }

    public function changePassword(array $claims): void
    {
        $userId = $claims['user_id'] ?? ($claims['sub'] ?? null);
        if (!$userId) {
            Response::error('المصادقة مطلوبة', 'UNAUTHORIZED', 401);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $oldPassword = $input['old_password'] ?? '';
        $newPassword = $input['new_password'] ?? '';

        try {
            $this->authService->changePassword($userId, $oldPassword, $newPassword);
            Response::success(null, 'تم تغيير كلمة المرور بنجاح. يرجى تسجيل الدخول مجدداً.');
        } catch (InvalidArgumentException $e) {
            Response::error($e->getMessage(), 'VALIDATION_ERROR', 400);
        } catch (RuntimeException $e) {
            Response::error($e->getMessage(), 'INVALID_PASSWORD', 400);
        } catch (\Throwable $e) {
            error_log('[AuthApiController::changePassword] Exception: ' . $e->getMessage());
            Response::error('فشل في تغيير كلمة المرور', 'INTERNAL_ERROR', 500);
        }
    }
}
