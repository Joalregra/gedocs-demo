<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('p_q_r_s', function (Blueprint $table) {
            $table->boolean('archived')->default(false)->after('state');
        });
    }

    public function down(): void
    {
        Schema::table('p_q_r_s', function (Blueprint $table) {
            $table->dropColumn('archived');
        });
    }
};
