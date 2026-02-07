export const countries = [
  {
    id: "za",
    name: "South Africa",
    enabled: true,
    cities: ["Johannesburg", "Pretoria", "Polokwane", "Cape Town"],
  },
  {
    id: "ng",
    name: "Nigeria",
    enabled: true,
    cities: ["Lagos", "Abuja", "Ibadan"],
  },
  {
    id: "ke",
    name: "Kenya",
    enabled: false,
    cities: ["Nairobi", "Mombasa"],
  },
];

export const providers = [
  {
    id: "prov-0192",
    name: "Amina Dlamini",
    service: "Home Cleaning",
    country: "South Africa",
    status: "Pending",
  },
  {
    id: "prov-0193",
    name: "Tariq Mensah",
    service: "Plumbing",
    country: "South Africa",
    status: "Approved",
  },
  {
    id: "prov-0194",
    name: "Lerato Molefe",
    service: "Hair Styling",
    country: "South Africa",
    status: "Suspended",
  },
];

export const jobs = [
  {
    id: "job-4440",
    customer: "Nandi Radebe",
    provider: "Amina Dlamini",
    service: "Home Cleaning",
    country: "South Africa",
    status: "In Progress",
    date: "2024-05-10",
  },
  {
    id: "job-4441",
    customer: "Kwame Okoro",
    provider: "Tariq Mensah",
    service: "Plumbing",
    country: "South Africa",
    status: "Completed",
    date: "2024-05-09",
  },
  {
    id: "job-4442",
    customer: "Thandi Moyo",
    provider: "Lerato Molefe",
    service: "Hair Styling",
    country: "South Africa",
    status: "Cancelled",
    date: "2024-05-08",
  },
];

export const ratings = [
  {
    id: "rate-3201",
    provider: "Amina Dlamini",
    customer: "Nandi Radebe",
    score: 4.7,
    dispute: false,
  },
  {
    id: "rate-3202",
    provider: "Tariq Mensah",
    customer: "Kwame Okoro",
    score: 3.9,
    dispute: true,
  },
];

export const adminUsers = [
  {
    id: "admin-01",
    name: "Super Admin",
    email: "super@worko.africa",
    role: "Super Admin",
    status: "Active",
  },
  {
    id: "admin-02",
    name: "Lindiwe Nkosi",
    email: "lindiwe@worko.africa",
    role: "Admin",
    status: "Active",
  },
  {
    id: "admin-03",
    name: "Kofi Adeyemi",
    email: "kofi@worko.africa",
    role: "Support",
    status: "Invited",
  },
];
