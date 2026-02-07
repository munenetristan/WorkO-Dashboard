"use client";

import { useMemo, useState } from "react";
import { apiClient, apiPaths } from "@/lib/api-client";
import { servicesCatalog } from "@/lib/services";
import {
  adminUsers,
  countries,
  jobs,
  providers,
  ratings,
} from "@/lib/sample-data";
import {
  Badge,
  Button,
  Card,
  Modal,
  SectionHeading,
  StatCard,
  Toggle,
} from "@/components/ui";

const navItems = [
  "Overview",
  "Countries",
  "Services",
  "Pricing",
  "Providers",
  "Jobs",
  "Admin Users",
  "Settings",
];

const initialPricing = [
  {
    id: "price-1",
    country: "South Africa",
    city: "Johannesburg",
    zone: "Sandton",
    service: "Home Cleaning",
    fee: 120,
  },
  {
    id: "price-2",
    country: "South Africa",
    city: "Polokwane",
    zone: "CBD",
    service: "Home Cleaning",
    fee: 80,
  },
  {
    id: "price-3",
    country: "Nigeria",
    city: "Lagos",
    zone: "Lekki",
    service: "Plumbing",
    fee: 150,
  },
];

const statusTone = (status: string) => {
  if (status === "Approved" || status === "Completed" || status === "Active") {
    return "green" as const;
  }
  if (status === "Pending" || status === "In Progress") {
    return "yellow" as const;
  }
  if (status === "Suspended" || status === "Cancelled") {
    return "red" as const;
  }
  return "slate" as const;
};

export default function Home() {
  const [activeNav, setActiveNav] = useState("Overview");
  const [selectedCountry, setSelectedCountry] = useState(countries[0]?.name ?? "");
  const [serviceSearch, setServiceSearch] = useState("");
  const [pricingEntries, setPricingEntries] = useState(initialPricing);
  const [modal, setModal] = useState<
    "approve" | "reject" | "zone" | "pricing" | null
  >(null);
  const [toast, setToast] = useState<{
    message: string;
    tone: "green" | "red" | "blue";
  } | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }
    return window.localStorage.getItem("worko_admin_token");
  });
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const services = useMemo(() => {
    return servicesCatalog
      .filter((service) =>
        service.name.toLowerCase().includes(serviceSearch.toLowerCase())
      )
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [serviceSearch]);

  const [enabledServices, setEnabledServices] = useState(() => {
    const map = new Map<string, boolean>();
    servicesCatalog.forEach((service, index) => {
      map.set(service.id, index < 20);
    });
    return map;
  });

  const showToast = (message: string, tone: "green" | "red" | "blue") => {
    setToast({ message, tone });
    setTimeout(() => setToast(null), 3000);
  };

  const handleToggleService = (id: string) => {
    setEnabledServices((prev) => {
      const next = new Map(prev);
      next.set(id, !prev.get(id));
      return next;
    });
    showToast("Service availability updated.", "blue");
  };

  const handleAddPricing = () => {
    setPricingEntries((prev) => [
      {
        id: `price-${prev.length + 1}`,
        country: selectedCountry,
        city: "New City",
        zone: "Zone A",
        service: "Home Cleaning",
        fee: 100,
      },
      ...prev,
    ]);
    showToast("Pricing entry created.", "green");
    setModal(null);
  };

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const fakeToken = "demo-token";
      window.localStorage.setItem("worko_admin_token", fakeToken);
      setToken(fakeToken);
      showToast("Signed in successfully.", "green");
    } catch {
      showToast("Unable to sign in.", "red");
    } finally {
      setIsLoading(false);
    }
  };

  const handleHealthCheck = async () => {
    try {
      await apiClient.get(apiPaths.settings);
      showToast("Backend healthy.", "green");
    } catch {
      showToast("Backend health check failed.", "red");
    }
  };

  const handleLogout = () => {
    window.localStorage.removeItem("worko_admin_token");
    setToken(null);
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-12">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
            <h1 className="text-3xl font-semibold text-slate-900">
              WorkO Admin Console
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Sign in with your admin account to manage countries, services,
              pricing, providers, and jobs.
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Email
                <input
                  value={loginEmail}
                  onChange={(event) => setLoginEmail(event.target.value)}
                  placeholder="admin@worko.africa"
                  className="h-11 rounded-lg border border-slate-200 px-4 text-sm"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Password
                <input
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                  type="password"
                  placeholder="••••••••"
                  className="h-11 rounded-lg border border-slate-200 px-4 text-sm"
                />
              </label>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button
                onClick={handleLogin}
                size="lg"
                variant="primary"
              >
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>
              <Button
                onClick={() => {
                  setLoginEmail("super@worko.africa");
                  setLoginPassword("worko-demo");
                }}
                size="lg"
                variant="secondary"
              >
                Use demo credentials
              </Button>
            </div>
          </div>
          <Card className="bg-slate-900 text-white">
            <p className="text-sm text-slate-200">
              API base URL configured: {process.env.NEXT_PUBLIC_API_URL ?? "Not set"}
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        <aside className="sticky top-0 hidden h-screen w-64 flex-col gap-8 border-r border-slate-200 bg-white px-6 py-8 lg:flex">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">WorkO</p>
            <h1 className="text-xl font-semibold text-slate-900">Admin Dashboard</h1>
          </div>
          <nav className="flex flex-1 flex-col gap-2">
            {navItems.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setActiveNav(item)}
                className={`rounded-lg px-4 py-2 text-left text-sm font-semibold transition ${
                  activeNav === item
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {item}
              </button>
            ))}
          </nav>
          <div className="rounded-2xl bg-slate-50 p-4 text-xs text-slate-500">
            <p className="font-semibold text-slate-700">API Status</p>
            <p className="mt-2">Connected to {process.env.NEXT_PUBLIC_API_URL ?? ""}</p>
            <button
              type="button"
              className="mt-3 text-xs font-semibold text-slate-700"
              onClick={handleHealthCheck}
            >
              Run health check
            </button>
          </div>
        </aside>

        <main className="flex-1 px-6 py-8 lg:px-10">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">
                Welcome back, Super Admin
              </h2>
              <p className="text-sm text-slate-500">
                Here is a live overview of WorkO operations.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="secondary" onClick={() => setModal("pricing")}
                >Create pricing</Button
              >
              <Button variant="secondary" onClick={() => setModal("zone")}>
                Add zone
              </Button>
              <Button variant="primary" onClick={() => showToast("Report downloaded.", "green")}>
                Download report
              </Button>
              <Button variant="ghost" onClick={handleLogout}>
                Log out
              </Button>
            </div>
          </header>

          <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Active countries" value="6" delta="+2" />
            <StatCard label="Verified providers" value="1,248" delta="+12%" />
            <StatCard label="Jobs in progress" value="84" delta="+6" />
            <StatCard label="Average rating" value="4.7" delta="+0.2" />
          </section>

          <section className="mt-10 space-y-6">
            <SectionHeading
              title="Countries"
              description="Enable or disable countries that appear in the mobile app."
              action={<Button variant="secondary">Add country</Button>}
            />
            <Card className="p-0">
              <div className="grid gap-4 border-b border-slate-200 p-4 md:grid-cols-3">
                <input
                  placeholder="Search countries"
                  className="h-10 rounded-lg border border-slate-200 px-4 text-sm"
                />
                <select className="h-10 rounded-lg border border-slate-200 px-4 text-sm">
                  <option>Status: All</option>
                  <option>Enabled</option>
                  <option>Disabled</option>
                </select>
                <select className="h-10 rounded-lg border border-slate-200 px-4 text-sm">
                  <option>Sort by: Alphabetical</option>
                  <option>Newest</option>
                </select>
              </div>
              <div className="divide-y divide-slate-200">
                {countries.map((country) => (
                  <div
                    key={country.id}
                    className="grid items-center gap-3 p-4 md:grid-cols-[2fr_2fr_1fr]"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {country.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        Cities: {country.cities.join(", ")}
                      </p>
                    </div>
                    <div className="text-xs text-slate-500">
                      Providers ready: 120 · Services enabled: 33
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge tone={country.enabled ? "green" : "red"}>
                        {country.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                      <Toggle
                        enabled={country.enabled}
                        onClick={() => showToast("Country status updated.", "blue")}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </section>

          <section className="mt-10 space-y-6">
            <SectionHeading
              title="Services"
              description="Manage the full 41-service catalog and enable them per country."
              action={
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={selectedCountry}
                    onChange={(event) => setSelectedCountry(event.target.value)}
                    className="h-10 rounded-lg border border-slate-200 px-4 text-sm"
                  >
                    {countries.map((country) => (
                      <option key={country.id} value={country.name}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                  <Button variant="secondary">Sync catalog</Button>
                </div>
              }
            />
            <Card className="p-0">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
                <input
                  value={serviceSearch}
                  onChange={(event) => setServiceSearch(event.target.value)}
                  placeholder="Search services"
                  className="h-10 w-full max-w-xs rounded-lg border border-slate-200 px-4 text-sm"
                />
                <Badge tone="purple">{services.length} services</Badge>
              </div>
              <div className="divide-y divide-slate-200">
                {services.map((service) => (
                  <div
                    key={service.id}
                    className="grid items-center gap-3 p-4 md:grid-cols-[2fr_1fr_1fr_1fr]"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {service.name}
                      </p>
                      <p className="text-xs text-slate-500">ID: {service.id}</p>
                    </div>
                    <div className="text-xs text-slate-500">
                      Gender tag: <Badge tone="blue">{service.genderTag}</Badge>
                    </div>
                    <div className="text-xs text-slate-500">
                      Sort order: {service.sortOrder}
                    </div>
                    <div className="flex items-center justify-end gap-3">
                      <span className="text-xs text-slate-500">{selectedCountry}</span>
                      <Toggle
                        enabled={Boolean(enabledServices.get(service.id))}
                        onClick={() => handleToggleService(service.id)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </section>

          <section className="mt-10 space-y-6">
            <SectionHeading
              title="Pricing"
              description="Manage booking fees per service and zone, with city-level overrides."
              action={
                <div className="flex items-center gap-3">
                  <Button variant="secondary" onClick={() => setModal("zone")}>
                    Create zone
                  </Button>
                  <Button variant="primary" onClick={() => setModal("pricing")}>
                    Set pricing
                  </Button>
                </div>
              }
            />
            <Card className="p-0">
              <div className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-4">
                <select className="h-10 rounded-lg border border-slate-200 px-4 text-sm">
                  <option>Country: All</option>
                  {countries.map((country) => (
                    <option key={country.id}>{country.name}</option>
                  ))}
                </select>
                <select className="h-10 rounded-lg border border-slate-200 px-4 text-sm">
                  <option>City/Zone: All</option>
                  <option>Johannesburg · Sandton</option>
                  <option>Polokwane · CBD</option>
                </select>
                <select className="h-10 rounded-lg border border-slate-200 px-4 text-sm">
                  <option>Service: All</option>
                  {servicesCatalog.slice(0, 6).map((service) => (
                    <option key={service.id}>{service.name}</option>
                  ))}
                </select>
                <Button variant="secondary">Export pricing</Button>
              </div>
              <div className="divide-y divide-slate-200">
                {pricingEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="grid items-center gap-3 p-4 md:grid-cols-[2fr_2fr_2fr_1fr_1fr]"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {entry.service}
                      </p>
                      <p className="text-xs text-slate-500">{entry.country}</p>
                    </div>
                    <div className="text-xs text-slate-500">{entry.city}</div>
                    <div className="text-xs text-slate-500">{entry.zone}</div>
                    <div className="text-sm font-semibold text-slate-900">
                      R{entry.fee}
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => showToast("Pricing updated.", "green")}
                    >
                      Edit
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          </section>

          <section className="mt-10 space-y-6">
            <SectionHeading
              title="Provider verification"
              description="Review provider documents, approve, suspend, or ban accounts."
              action={<Button variant="secondary">View all providers</Button>}
            />
            <Card className="p-0">
              <div className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-3">
                <input
                  placeholder="Search providers"
                  className="h-10 rounded-lg border border-slate-200 px-4 text-sm"
                />
                <select className="h-10 rounded-lg border border-slate-200 px-4 text-sm">
                  <option>Status: All</option>
                  <option>Pending</option>
                  <option>Approved</option>
                  <option>Suspended</option>
                </select>
                <select className="h-10 rounded-lg border border-slate-200 px-4 text-sm">
                  <option>Country: All</option>
                  {countries.map((country) => (
                    <option key={country.id}>{country.name}</option>
                  ))}
                </select>
              </div>
              <div className="divide-y divide-slate-200">
                {providers.map((provider) => (
                  <div
                    key={provider.id}
                    className="grid items-center gap-3 p-4 md:grid-cols-[2fr_1fr_1fr_1fr_1fr]"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {provider.name}
                      </p>
                      <p className="text-xs text-slate-500">{provider.id}</p>
                    </div>
                    <div className="text-xs text-slate-500">{provider.service}</div>
                    <div className="text-xs text-slate-500">{provider.country}</div>
                    <Badge tone={statusTone(provider.status)}>{provider.status}</Badge>
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={() => setModal("approve")}>
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setModal("reject")}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </section>

          <section className="mt-10 space-y-6">
            <SectionHeading
              title="Job monitoring"
              description="Track live jobs with filters by status, service, and country."
              action={<Button variant="secondary">View timeline</Button>}
            />
            <Card className="p-0">
              <div className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-4">
                <select className="h-10 rounded-lg border border-slate-200 px-4 text-sm">
                  <option>Status: All</option>
                  <option>In Progress</option>
                  <option>Completed</option>
                  <option>Cancelled</option>
                </select>
                <select className="h-10 rounded-lg border border-slate-200 px-4 text-sm">
                  <option>Country: All</option>
                  {countries.map((country) => (
                    <option key={country.id}>{country.name}</option>
                  ))}
                </select>
                <select className="h-10 rounded-lg border border-slate-200 px-4 text-sm">
                  <option>Service: All</option>
                  {servicesCatalog.slice(0, 6).map((service) => (
                    <option key={service.id}>{service.name}</option>
                  ))}
                </select>
                <input
                  type="date"
                  className="h-10 rounded-lg border border-slate-200 px-4 text-sm"
                />
              </div>
              <div className="divide-y divide-slate-200">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className="grid items-center gap-3 p-4 md:grid-cols-[2fr_2fr_2fr_1fr_1fr]"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{job.id}</p>
                      <p className="text-xs text-slate-500">{job.date}</p>
                    </div>
                    <div className="text-xs text-slate-500">
                      Customer: {job.customer}
                    </div>
                    <div className="text-xs text-slate-500">
                      Provider: {job.provider}
                    </div>
                    <div className="text-xs text-slate-500">{job.service}</div>
                    <Badge tone={statusTone(job.status)}>{job.status}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          </section>

          <section className="mt-10 space-y-6">
            <SectionHeading
              title="Ratings monitoring"
              description="Watch provider and customer scores, flag disputes, and take action."
              action={<Button variant="secondary">Export ratings</Button>}
            />
            <Card className="p-0">
              <div className="divide-y divide-slate-200">
                {ratings.map((rating) => (
                  <div
                    key={rating.id}
                    className="grid items-center gap-3 p-4 md:grid-cols-[2fr_2fr_1fr_1fr]"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Provider: {rating.provider}
                      </p>
                      <p className="text-xs text-slate-500">
                        Customer: {rating.customer}
                      </p>
                    </div>
                    <div className="text-xs text-slate-500">
                      Score: <span className="font-semibold">{rating.score}</span>
                    </div>
                    <Badge tone={rating.dispute ? "red" : "green"}>
                      {rating.dispute ? "Dispute" : "Clear"}
                    </Badge>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        showToast("Rating review opened in sidebar.", "blue")
                      }
                    >
                      Review
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          </section>

          <section className="mt-10 space-y-6">
            <SectionHeading
              title="Admin users"
              description="Control admin access, roles, and permissions."
              action={<Button variant="secondary">Invite admin</Button>}
            />
            <Card className="p-0">
              <div className="divide-y divide-slate-200">
                {adminUsers.map((admin) => (
                  <div
                    key={admin.id}
                    className="grid items-center gap-3 p-4 md:grid-cols-[2fr_2fr_1fr_1fr]"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {admin.name}
                      </p>
                      <p className="text-xs text-slate-500">{admin.email}</p>
                    </div>
                    <div className="text-xs text-slate-500">{admin.role}</div>
                    <Badge tone={statusTone(admin.status)}>{admin.status}</Badge>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => showToast("Permissions updated.", "green")}
                    >
                      Manage
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          </section>

          <section className="mt-10 space-y-6">
            <SectionHeading
              title="Settings"
              description="Integrations, Firebase health, and payment configuration."
              action={<Button variant="secondary">Refresh status</Button>}
            />
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <h3 className="text-sm font-semibold text-slate-900">
                  Firebase Configuration
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Project: worko-admin · Health: Operational
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => showToast("Firebase health checked.", "green")}
                >
                  Run health check
                </Button>
              </Card>
              <Card>
                <h3 className="text-sm font-semibold text-slate-900">
                  Payment Provider Keys
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Stripe + Paystack keys stored securely in backend vault.
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => showToast("Payment keys synced.", "blue")}
                >
                  Sync keys
                </Button>
              </Card>
            </div>
          </section>

          <Modal
            open={modal === "approve"}
            title="Approve provider"
            description="Confirm provider verification and unlock jobs."
            onClose={() => setModal(null)}
          >
            <p className="text-sm text-slate-600">
              Documents are verified. Approve this provider and notify them.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setModal(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  showToast("Provider approved.", "green");
                  setModal(null);
                }}
              >
                Approve
              </Button>
            </div>
          </Modal>

          <Modal
            open={modal === "reject"}
            title="Reject provider"
            description="Share a reason and log the audit trail."
            onClose={() => setModal(null)}
          >
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Reason
              <textarea
                className="min-h-[100px] rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="Missing identity document, unclear selfie, etc."
              />
            </label>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setModal(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  showToast("Provider rejected.", "red");
                  setModal(null);
                }}
              >
                Reject
              </Button>
            </div>
          </Modal>

          <Modal
            open={modal === "zone"}
            title="Create zone"
            description="Add a new city or zone to a country."
            onClose={() => setModal(null)}
          >
            <div className="grid gap-3">
              <input
                placeholder="Country"
                className="h-10 rounded-lg border border-slate-200 px-4 text-sm"
              />
              <input
                placeholder="City"
                className="h-10 rounded-lg border border-slate-200 px-4 text-sm"
              />
              <input
                placeholder="Zone"
                className="h-10 rounded-lg border border-slate-200 px-4 text-sm"
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setModal(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  showToast("Zone created.", "green");
                  setModal(null);
                }}
              >
                Save zone
              </Button>
            </div>
          </Modal>

          <Modal
            open={modal === "pricing"}
            title="Set pricing"
            description="Create a booking fee for a service and zone."
            onClose={() => setModal(null)}
          >
            <div className="grid gap-3">
              <input
                placeholder="Service"
                className="h-10 rounded-lg border border-slate-200 px-4 text-sm"
              />
              <input
                placeholder="Country"
                className="h-10 rounded-lg border border-slate-200 px-4 text-sm"
              />
              <input
                placeholder="City"
                className="h-10 rounded-lg border border-slate-200 px-4 text-sm"
              />
              <input
                placeholder="Zone"
                className="h-10 rounded-lg border border-slate-200 px-4 text-sm"
              />
              <input
                placeholder="Fee (ZAR)"
                className="h-10 rounded-lg border border-slate-200 px-4 text-sm"
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setModal(null)}>
                Cancel
              </Button>
              <Button onClick={handleAddPricing}>Save pricing</Button>
            </div>
          </Modal>
        </main>
      </div>

      {toast ? (
        <div className="fixed bottom-6 right-6 z-50">
          <div
            className={`rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg ${
              toast.tone === "green"
                ? "bg-emerald-500"
                : toast.tone === "red"
                  ? "bg-rose-500"
                  : "bg-blue-500"
            }`}
          >
            {toast.message}
          </div>
        </div>
      ) : null}
    </div>
  );
}
