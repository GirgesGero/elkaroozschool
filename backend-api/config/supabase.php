<?php
// backend-api/config/supabase.php

return [
    'url' => getenv('SUPABASE_URL') ?: 'https://kgqgnqjkrghvktymbimz.supabase.co',
    'jwt_secret' => getenv('SUPABASE_JWT_SECRET') ?: 'your-supabase-jwt-secret',
    'service_role_key' => getenv('SUPABASE_SERVICE_ROLE_KEY') ?: '',
    'anon_key' => getenv('SUPABASE_ANON_KEY') ?: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtncWducWprcmdodmt0eW1iaW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzNjk2NzgsImV4cCI6MjEwNTk0NTY3OH0.QHZCfNWf97-3fCONdMeXnWqeZMYyZ8NHIFfTwnHnj-w',
];
