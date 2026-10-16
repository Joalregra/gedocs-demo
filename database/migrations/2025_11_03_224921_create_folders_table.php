<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('folders', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->integer('parent_id')->nullable();
            $table->boolean("active")->default(true);
            $table->string('folder_code')->nullable();
            $table->integer('year')->nullable();
            $table->string("department");
            $table->unsignedBigInteger('sheet_number_id')->nullable();
            $table->foreign('sheet_number_id')->references('id')->on('sheet_numbers')->onDelete('set null');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('folders');
    }
};
