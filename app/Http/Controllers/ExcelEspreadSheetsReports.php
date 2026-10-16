<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\ExcelExport;

class ExcelEspreadSheetsReports extends Controller
{
    public function export(Request $request)
    {
        // Validate and collect optional filters
        $validated = $request->validate([
            'trimester' => 'nullable|integer|min:1|max:4',
            'year' => 'nullable|integer|min:2000|max:2100',
            'from' => 'nullable|date',
            'to' => 'nullable|date|after_or_equal:from',
            'archived' => 'nullable', // boolean-ish (true/false/1/0)
            'dependency_id' => 'nullable|integer',
            'responsible_id' => 'nullable|integer',
            'response_status' => 'nullable|string|in:pending,responded,closed',
            'direction' => 'nullable|string|in:received,sent', // placeholder until field exists
            'environment' => 'nullable|string', // placeholder
        ]);

        $filters = $request->only([
            'trimester', 'year', 'from', 'to', 'archived', 'dependency_id', 'responsible_id', 'response_status', 'direction', 'environment'
        ]);

        $timestamp = now()->format('Ymd_His');
        $fileName = "pqrs_report_{$timestamp}.xlsx";

        return Excel::download(new ExcelExport($filters), $fileName);
    }
}
