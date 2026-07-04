"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DemandEntry {
  id: string;
  query: string | null;
  latitude: number | null;
  longitude: number | null;
  category: string | null;
  results_count: number;
  created_at: string;
}

interface AreaStat {
  query: string;
  count: number;
  no_results: number;
}

export default function DemandPage() {
  const supabase = createClient();
  const [searches, setSearches] = useState<DemandEntry[]>([]);
  const [areaStats, setAreaStats] = useState<AreaStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("search_demand")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      const entries = (data ?? []) as DemandEntry[];
      setSearches(entries);

      // Compute top searched areas
      const counts = new Map<string, { total: number; noResults: number }>();
      entries.forEach((e) => {
        const key = e.query?.toLowerCase() ?? "(nearby)";
        const existing = counts.get(key) ?? { total: 0, noResults: 0 };
        existing.total++;
        if (e.results_count === 0) existing.noResults++;
        counts.set(key, existing);
      });

      const stats = Array.from(counts.entries())
        .map(([query, { total, noResults }]) => ({
          query,
          count: total,
          no_results: noResults,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);

      setAreaStats(stats);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return null;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Search Demand</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top searched areas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top searched areas</CardTitle>
          </CardHeader>
          <CardContent>
            {areaStats.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet</p>
            ) : (
              <div className="space-y-2">
                {areaStats.map((stat) => (
                  <div
                    key={stat.query}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="font-medium">{stat.query}</span>
                    <div className="flex gap-3 text-muted-foreground">
                      <span>{stat.count} searches</span>
                      {stat.no_results > 0 && (
                        <span className="text-red-500">
                          {stat.no_results} no results
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent searches */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent searches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {searches.slice(0, 30).map((s) => (
                <div key={s.id} className="flex justify-between text-sm">
                  <span>{s.query ?? `${s.latitude?.toFixed(3)}, ${s.longitude?.toFixed(3)}`}</span>
                  <div className="flex gap-2 text-muted-foreground">
                    {s.category && <span>{s.category}</span>}
                    <span>
                      {s.results_count === 0 ? (
                        <span className="text-red-500">0 results</span>
                      ) : (
                        `${s.results_count} results`
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
