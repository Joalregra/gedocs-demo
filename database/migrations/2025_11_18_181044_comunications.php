<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use League\CommonMark\Reference\ReferenceParser;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('comunications', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('pqr_id');
            $table->longText('message');
            $table->boolean('archived')->default(false);
            $table->timestamps();

            //Relaciones
            $table->foreign('pqr_id')->references('id')->on('p_q_r_s')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
