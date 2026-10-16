<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Updates the state column default to "Activa" (Spanish) and
     * fixes any existing records that were created with the old English default "active".
     */
    public function up(): void
    {
        // Fix existing records that have the old English default
        DB::table('sheet_numbers')
            ->where('state', 'active')
            ->update(['state' => 'Activa']);

        // Update the column default
        Schema::table('sheet_numbers', function (Blueprint $table) {
            $table->string('state')->nullable()->default('Activa')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('sheet_numbers')
            ->where('state', 'Activa')
            ->update(['state' => 'active']);

        Schema::table('sheet_numbers', function (Blueprint $table) {
            $table->string('state')->nullable()->default('active')->change();
        });
    }
};
