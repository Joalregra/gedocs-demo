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
        Schema::create('sheet_numbers', function (Blueprint $table) {
            $table->id();
            $table->string("number")->unique();
            $table->boolean("active")->nullable()->default(false); // The supervisor can activate the sheet in the dashboard
            $table->string("state")->nullable()->default("Activa"); // The state of the sheet (Activa, Inactiva, etc.)
            $table->unsignedBigInteger('ventanilla_unica_id')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sheet_numbers');
    }
};
