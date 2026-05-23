import { z } from "zod";

export const AgencyCreateSchema = z.object({
  companyName: z.string().min(1, "Şirket adı zorunludur"),
  documentNo: z.string().min(1, "Belge numarası zorunludur"),
  btkZone: z.string().optional(),
  website: z.string().optional(),
  authorizedPerson: z.string().optional(),
  status: z.enum(["ACTIVE", "PASSIVE", "LEAD", "BLOCKED", "REJECTED"]).optional(),
});

export const AgencyUpdateSchema = z.object({
  id: z.string(),
  companyName: z.string().min(1).optional(),
  documentNo: z.string().min(1).optional(),
  btkZone: z.string().optional(),
  website: z.string().optional(),
  authorizedPerson: z.string().optional(),
  status: z.enum(["ACTIVE", "PASSIVE", "LEAD", "BLOCKED", "REJECTED"]).optional(),
});

export const ContactSchema = z.object({
  phone: z.string().optional(),
  email: z.string().email("Geçerli bir e-posta girin").optional(),
  address: z.string().optional(),
  province: z.string().optional(),
  district: z.string().optional(),
  agencyId: z.string(),
});

export const OfferCreateSchema = z.object({
  agencyId: z.string().optional(),
  agencyIds: z.array(z.string()).optional(),
  isMassOperation: z.boolean().optional(),
  type: z.enum(["OFFER", "PROMOTION"]).optional(),
  subject: z.string().optional(),
  content: z.string().optional(),
  coverLetter: z.string().optional(),
  moduleIds: z.array(z.string()).optional(),
  totalSoftwarePrice: z.number().optional(),
});

export const UserCreateSchema = z.object({
  name: z.string().min(1, "Ad zorunludur"),
  email: z.string().email("Geçerli bir e-posta girin"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalıdır"),
  roleId: z.string(),
});

export const SectorCreateSchema = z.object({
  name: z.string().min(1, "Sektör adı zorunludur"),
  description: z.string().optional(),
  pdfUrl: z.string().optional(),
});

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}
