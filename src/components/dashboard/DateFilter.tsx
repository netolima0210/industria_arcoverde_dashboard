"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { startOfDay, endOfDay } from "date-fns";
import { useState, useEffect } from "react";

export function DateFilter() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Custom date state
    const [customStart, setCustomStart] = useState("");
    const [customEnd, setCustomEnd] = useState("");

    // Sync state with URL params on load
    useEffect(() => {
        const start = searchParams.get('start_date');
        const end = searchParams.get('end_date');
        if (start) setCustomStart(new Date(start).toISOString().split('T')[0]);
        if (end) setCustomEnd(new Date(end).toISOString().split('T')[0]);
    }, [searchParams]);

    const applyCustomRange = () => {
        if (!customStart || !customEnd) return;

        const params = new URLSearchParams(searchParams);
        // Remove 'filter' param since we are always custom now
        params.delete("filter");

        // Set time to start of day for start date, end of day for end date
        // Fix date parsing to avoid timezone issues with pure strings
        const start = startOfDay(new Date(customStart + 'T00:00:00'));
        const end = endOfDay(new Date(customEnd + 'T23:59:59'));

        params.set("start_date", start.toISOString());
        params.set("end_date", end.toISOString());

        router.push(`?${params.toString()}`);
    }

    return (
        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-5">
            <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            />
            <span className="text-gray-500">-</span>
            <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            />
            <button
                onClick={applyCustomRange}
                disabled={!customStart || !customEnd}
                className="bg-indigo-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Filtrar
            </button>
        </div>
    );
}
