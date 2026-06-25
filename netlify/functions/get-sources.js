const { createClient } = require('@supabase/supabase-js');

exports.handler = async function () {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Source health rows
  const { data: sources, error: srcErr } = await supabase
    .from('sources')
    .select(
      'name,url,tier,type,enabled,last_success_at,last_status,last_error,total_items,last_run_items'
    )
    .order('tier', { ascending: true })
    .order('name', { ascending: true });

  if (srcErr) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: srcErr.message }),
    };
  }

  // Most recent run (for "last run" cost + stats)
  const { data: lastRun } = await supabase
    .from('ingest_runs')
    .select('finished_at,new_items,feeds_ok,feeds_failed,cost_usd')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Total cost to date
  const { data: allRuns } = await supabase
    .from('ingest_runs')
    .select('cost_usd');

  const totalCost = (allRuns || []).reduce(
    (sum, r) => sum + Number(r.cost_usd || 0),
    0
  );

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify({
      sources: sources || [],
      lastRun: lastRun || null,
      totalCost: Number(totalCost.toFixed(4)),
    }),
  };
};
