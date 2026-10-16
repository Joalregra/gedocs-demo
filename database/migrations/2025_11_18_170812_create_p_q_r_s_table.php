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
        Schema::create('p_q_r_s', function (Blueprint $table) {
            $table->id();
            $table->string('sender_name')->nullable();
            $table->text('description');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('affair');
            $table->unsignedSmallInteger('response_days')->nullable();
            $table->date('response_time')->nullable();
            $table->boolean('state')->default(false);
            $table->foreignId('responsible_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('dependency_id')->constrained('dependencies')->onDelete('cascade');
            $table->string('email')->nullable()->unique();
            $table->string('document')->nullable()->unique();
            $table->string('document_type')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('p_q_r_s');
    }
};
