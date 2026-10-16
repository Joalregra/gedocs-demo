<?php

namespace App\Http\Middleware;

use App\Models\Dependency;
use App\Models\Sheet_number;
use App\Support\EntityAccess;
use App\Support\InstitutionIdentity;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user() ? $request->user()->load(["roles", 'sheetNumbers' => function ($q) {
                    $q->active();
                }]) : [],
            ],
            // Public institution identity (no secrets): name, logo and default PDF footer.
            'institution' => [
                'name' => config('institution.name'),
                'short_name' => config('institution.short_name'),
                'logo_url' => InstitutionIdentity::logoUrl(),
                'default_footer' => InstitutionIdentity::defaultFooter(),
                'default_footer_short' => InstitutionIdentity::defaultFooter(false),
            ],
            'demo' => (bool) config('app.demo'),
            "notifications" => $request->user() ? $request->user()->notifications : null,
            'flash' => fn() => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
                'status' => $request->session()->get('status'),
            ],
            // Data isolation: every non-admin role only receives the entities (and their dependencies) it belongs to.
            "sheets" => $request->user() ? $this->visibleSheets($request->user()) : [],
            "dependencies" => $request->user() ? $this->visibleDependencies($request->user()) : [],
        ];
    }

    private function visibleSheets($user)
    {
        $ids = EntityAccess::sheetIds($user);
        $query = Sheet_number::active()->with("dependencies");

        return $ids === null ? $query->get() : $query->whereIn('id', $ids)->get();
    }

    private function visibleDependencies($user)
    {
        $ids = EntityAccess::sheetIds($user);

        if ($ids === null) {
            return Dependency::all();
        }

        return Dependency::whereIn('sheet_number_id', Sheet_number::active()->whereIn('id', $ids)->pluck('id'))->get();
    }
}
