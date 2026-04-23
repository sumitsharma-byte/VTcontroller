<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Laravel\Socialite\Facades\Socialite;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Fix cURL SSL certificate verification on Windows dev environments.
        // Guzzle (used by Socialite) has its own cert handling and ignores php.ini,
        // so we configure the HTTP client directly with our downloaded cacert.pem.
        $certPath = 'D:\\php\\extras\\cacert.pem';

        if (file_exists($certPath)) {
            $this->app->resolving(\Laravel\Socialite\SocialiteManager::class, function ($socialite) use ($certPath) {
                $socialite->extend('google', function ($app) use ($socialite, $certPath) {
                    $config = $app['config']['services.google'];
                    return $socialite->buildProvider(
                        \Laravel\Socialite\Two\GoogleProvider::class,
                        $config
                    )->setHttpClient(new \GuzzleHttp\Client(['verify' => $certPath]));
                });
            });
        }
    }
}
