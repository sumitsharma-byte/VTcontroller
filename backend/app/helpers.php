<?php

if (!function_exists('activity_log')) {
    /**
     * Log a system-wide activity event.
     */
    function activity_log(string $action, \Illuminate\Database\Eloquent\Model $entity, array $meta = []): void
    {
        try {
            \App\Models\ActivityLog::create([
                'user_id'     => auth()->id(),
                'action'      => $action,
                'entity_type' => get_class($entity),
                'entity_id'   => $entity->getKey(),
                'meta'        => $meta ?: null,
                'ip_address'  => request()?->ip(),
            ]);
        } catch (\Exception) {
            // Silently fail – never let logging break the request
        }
    }
}
