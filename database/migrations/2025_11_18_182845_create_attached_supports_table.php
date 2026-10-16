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
        Schema::create('attached_supports', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('path');
            $table->string('type');
            $table->unsignedBigInteger('size');
            $table->foreignId('pqr_id')->constrained('p_q_r_s')->onDelete('cascade');
            $table->unsignedBigInteger('comunication_id')->nullable();
            $table->foreign('comunication_id')->references('id')->on('comunications')->onDelete('cascade');
            $table->timestamps();
            $table->string('hash');
            $table->string('no_radicado');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attached_supports');
    }
};
