export type GenderTag = "M" | "W" | "B";

export type Service = {
  id: string;
  name: string;
  genderTag: GenderTag;
  sortOrder: number;
};

export const servicesCatalog: Service[] = [
  { id: "svc-cleaning", name: "Home Cleaning", genderTag: "B", sortOrder: 1 },
  { id: "svc-plumbing", name: "Plumbing", genderTag: "M", sortOrder: 2 },
  { id: "svc-electrical", name: "Electrical Repair", genderTag: "M", sortOrder: 3 },
  { id: "svc-hair", name: "Hair Styling", genderTag: "W", sortOrder: 4 },
  { id: "svc-makeup", name: "Makeup Artist", genderTag: "W", sortOrder: 5 },
  { id: "svc-nails", name: "Nail Technician", genderTag: "W", sortOrder: 6 },
  { id: "svc-barber", name: "Barber", genderTag: "M", sortOrder: 7 },
  { id: "svc-tutoring", name: "Tutoring", genderTag: "B", sortOrder: 8 },
  { id: "svc-babysitting", name: "Babysitting", genderTag: "W", sortOrder: 9 },
  { id: "svc-moving", name: "Moving Help", genderTag: "M", sortOrder: 10 },
  { id: "svc-painting", name: "Painting", genderTag: "B", sortOrder: 11 },
  { id: "svc-gardening", name: "Gardening", genderTag: "B", sortOrder: 12 },
  { id: "svc-laundry", name: "Laundry Service", genderTag: "B", sortOrder: 13 },
  { id: "svc-carwash", name: "Car Wash", genderTag: "B", sortOrder: 14 },
  { id: "svc-ac", name: "AC Servicing", genderTag: "M", sortOrder: 15 },
  { id: "svc-pc", name: "PC & Laptop Repair", genderTag: "B", sortOrder: 16 },
  { id: "svc-phone", name: "Phone Repair", genderTag: "B", sortOrder: 17 },
  { id: "svc-photography", name: "Photography", genderTag: "B", sortOrder: 18 },
  { id: "svc-event", name: "Event Setup", genderTag: "M", sortOrder: 19 },
  { id: "svc-catering", name: "Catering", genderTag: "B", sortOrder: 20 },
  { id: "svc-tailor", name: "Tailoring", genderTag: "B", sortOrder: 21 },
  { id: "svc-delivery", name: "Local Delivery", genderTag: "B", sortOrder: 22 },
  { id: "svc-errands", name: "Errand Running", genderTag: "B", sortOrder: 23 },
  { id: "svc-car-repair", name: "Car Repair", genderTag: "M", sortOrder: 24 },
  { id: "svc-windshield", name: "Windshield Repair", genderTag: "M", sortOrder: 25 },
  { id: "svc-pet", name: "Pet Grooming", genderTag: "B", sortOrder: 26 },
  { id: "svc-pet-walking", name: "Dog Walking", genderTag: "B", sortOrder: 27 },
  { id: "svc-security", name: "Security Guard", genderTag: "M", sortOrder: 28 },
  { id: "svc-handyman", name: "Handyman", genderTag: "M", sortOrder: 29 },
  { id: "svc-furniture", name: "Furniture Assembly", genderTag: "M", sortOrder: 30 },
  { id: "svc-interior", name: "Interior Design", genderTag: "W", sortOrder: 31 },
  { id: "svc-graphics", name: "Graphic Design", genderTag: "B", sortOrder: 32 },
  { id: "svc-video", name: "Video Editing", genderTag: "B", sortOrder: 33 },
  { id: "svc-accounting", name: "Accounting", genderTag: "B", sortOrder: 34 },
  { id: "svc-legal", name: "Legal Advice", genderTag: "B", sortOrder: 35 },
  { id: "svc-translation", name: "Translation", genderTag: "B", sortOrder: 36 },
  { id: "svc-fitness", name: "Personal Training", genderTag: "B", sortOrder: 37 },
  { id: "svc-massage", name: "Massage Therapy", genderTag: "W", sortOrder: 38 },
  { id: "svc-ride", name: "Driver", genderTag: "M", sortOrder: 39 },
  { id: "svc-warehouse", name: "Warehouse Help", genderTag: "M", sortOrder: 40 },
  {
    id: "svc-cleaning-commercial",
    name: "Commercial Cleaning",
    genderTag: "B",
    sortOrder: 41,
  },
];
