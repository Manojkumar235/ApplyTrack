import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useApplications } from "../applications/ApplicationsContext";
import ApplicationTable from "../components/ApplicationTable";
import Icon from "../components/Icons";
import PageHeader from "../components/PageHeader";
import {
  getApplicationStatusChartData,
  getApplicationStatusCounts,
} from "../utils/applicationStatuses";

export default function DashboardPage() {
  const { applications, isLoading, error } = useApplications();

  const stats = useMemo(() => {
    const counts = getApplicationStatusCounts(applications);
    return {
      total: applications.length,
      active: applications.filter((application) =>
        ["applied", "interviewing"].includes(application.status),
      ).length,
      interviews: counts.interviewing || 0,
      offers: counts.offer || 0,
      counts,
    };
  }, [applications]);

  const statusData = getApplicationStatusChartData(stats.counts);
  const stageData = statusData;

  return (
    <>
      <PageHeader
        eyebrow="YOUR JOB SEARCH"
        title="Overview"
        description="A clear view of your opportunities and next steps."
        action={
          <Link to="/dashboard/applications/new" className="button-primary">
            <Icon name="plus" size={18} />
            Add application
          </Link>
        }
      />

      {error && <div className="form-alert page-alert" role="alert">{error}</div>}

      <section className="metric-grid" aria-label="Application summary">
        <MetricCard label="Total applications" value={stats.total} icon="briefcase" accent="blue" loading={isLoading} />
        <MetricCard label="Active applications" value={stats.active} icon="chart" accent="violet" loading={isLoading} />
        <MetricCard label="Interviews" value={stats.interviews} icon="calendar" accent="amber" loading={isLoading} />
        <MetricCard label="Offers" value={stats.offers} icon="arrow" accent="green" loading={isLoading} />
      </section>

      <section className="insight-grid">
        <div className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <h2>Application pipeline</h2>
              <p>Opportunities by stage</p>
            </div>
            <span className="panel-icon"><Icon name="chart" size={18} /></span>
          </div>
          {isLoading ? (
            <div className="chart-placeholder">Loading pipeline…</div>
          ) : (
            <div className="chart-area">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stageData} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#edf0f5" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#8290a5", fontSize: 12 }} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#8290a5", fontSize: 12 }} />
                  <Tooltip cursor={{ fill: "#f5f7fb" }} />
                  <Bar dataKey="value" name="Applications" radius={[5, 5, 0, 0]} maxBarSize={42} isAnimationActive={false}>
                    {stageData.map((item) => (
                      <Cell key={item.status} fill={item.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="panel status-panel">
          <div className="panel-heading">
            <div>
              <h2>Status breakdown</h2>
              <p>Current application status</p>
            </div>
            <span className="panel-icon"><Icon name="grid" size={18} /></span>
          </div>
          {isLoading ? (
            <div className="chart-placeholder">Loading statuses…</div>
          ) : (
            <>
              <div className="donut-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={78}
                      paddingAngle={3}
                      stroke="none"
                      isAnimationActive={false}
                    >
                      {statusData.map((item) => (
                        <Cell key={item.status} fill={item.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="donut-center">
                  <strong>{stats.total}</strong>
                  <span>Total</span>
                </div>
              </div>
              <div className="legend-list">
                {statusData.map((item) => (
                  <div className="legend-row" key={item.name}>
                    <span className="legend-label">
                      <i style={{ backgroundColor: item.color }} />
                      {item.name}
                    </span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <section className="panel recent-panel">
        <div className="panel-heading">
          <div>
            <h2>Recent applications</h2>
            <p>Your latest opportunities at a glance.</p>
          </div>
          <Link to="/dashboard/applications" className="text-link">
            View all <Icon name="arrow" size={16} />
          </Link>
        </div>
        {isLoading ? (
          <div className="loading-row">Loading your applications…</div>
        ) : (
          <ApplicationTable applications={applications} compact />
        )}
      </section>
    </>
  );
}

function MetricCard({ label, value, icon, accent, loading }) {
  return (
    <div className="metric-card">
      <span className={`metric-icon metric-${accent}`}><Icon name={icon} size={19} /></span>
      <p>{label}</p>
      <strong>{loading ? "—" : value}</strong>
    </div>
  );
}
