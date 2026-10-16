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
        Schema::table('p_q_r_s', function (Blueprint $table) {
            $table->string('request_type');
            $table->unsignedBigInteger('sheet_number_id')->nullable();
            $table->foreign('sheet_number_id')->references('id')->on('sheet_numbers');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('p_q_r_s', function (Blueprint $table) {
            $table->dropForeign(['sheet_number_id']);
            $table->dropColumn(['request_type', 'sheet_number_id']);
        });
    }
};
