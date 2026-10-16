<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('folders', 'sheet_number_id')) {
            Schema::table('folders', function (Blueprint $table) {
                $table->unsignedBigInteger('sheet_number_id')->nullable()->after('department');
                $table->foreign('sheet_number_id')
                    ->references('id')
                    ->on('sheet_numbers')
                    ->onDelete('set null');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('folders', 'sheet_number_id')) {
            Schema::table('folders', function (Blueprint $table) {
                $table->dropForeign(['sheet_number_id']);
                $table->dropColumn('sheet_number_id');
            });
        }
    }
};
