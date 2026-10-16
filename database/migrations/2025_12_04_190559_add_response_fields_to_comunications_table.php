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
        Schema::table('comunications', function (Blueprint $table) {
            //Identificador unico de 36 caracteres
            $table->uuid('response_uuid')->nullable()->unique()->after('message');
            $table->timestamp('response_expires_at')->nullable()->after('response_uuid');
            $table->boolean('response_used')->default(false)->after('response_expires_at');
            $table->boolean('requires_response')->default(false)->after('response_used');
            $table->string('sender_type')->default('system')->after('requires_response');

            //La base de datos va directo al registro  (mas rapido que una consulta tradicional)
            $table->index(['response_uuid', 'response_used']);
            $table->index('response_expires_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('comunications', function (Blueprint $table) {
            $table->dropColumn([
                'response_uuid',
                'response_expires_at',
                'response_used',
                'requires_response',
                'sender_type'
            ]);
        });
    }
};
