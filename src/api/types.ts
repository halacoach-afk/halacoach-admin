export type AdminRole = 'super' | 'reviewer' | 'support';

export type AdminUser = {
  id: number;
  name: string;
  email: string;
  role: AdminRole;
  active: boolean;
  lastLogin: string | null;
  createdAt: string;
};

export type SessionUser = Pick<AdminUser, 'id' | 'name' | 'email' | 'role'>;

export type HealthResponse = {
  ok: boolean;
  source: 'api';
  app: string;
};

export type SessionResponse = {
  user: SessionUser;
  token?: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type InviteAdminInput = {
  name: string;
  email: string;
  role: AdminRole;
  password: string;
};

export type UpdateAdminInput = {
  name?: string;
  role?: AdminRole;
  active?: boolean;
};

export type CreditPackageBadge = 'popular' | 'value';

export type CreditPackage = {
  id: number;
  name: string;
  credits: number;
  price: number;
  badge?: CreditPackageBadge;
  sortOrder: number;
  active: boolean;
};

export type CreateCreditPackageInput = {
  name: string;
  credits: number;
  price: number;
  badge?: CreditPackageBadge | null;
};

export type UpdateCreditPackageInput = {
  name?: string;
  credits?: number;
  price?: number;
  badge?: CreditPackageBadge | null;
  active?: boolean;
};

export type PromoBenefitType = 'percent_off' | 'fixed_off' | 'bonus_credits';

export type PromoCode = {
  id: number;
  code: string;
  benefitType: PromoBenefitType;
  benefitValue: number;
  active: boolean;
  createdAt: string;
};

export type CreatePromoInput = {
  code: string;
  benefitType: PromoBenefitType;
  benefitValue: number;
};

export type UpdatePromoInput = {
  code?: string;
  benefitType?: PromoBenefitType;
  benefitValue?: number;
  active?: boolean;
};

export type CreditPurchase = {
  id: string;
  txnId: string;
  orderId: string;
  professionalId: string;
  packId: string;
  credits: number;
  subtotalAed: number;
  discountAed: number;
  vatAed: number;
  totalAed: number;
  promoCode: string | null;
  paymentMethod: 'card' | 'applepay';
  status: 'completed';
  at: string;
};

export type CreditLedgerEntry = {
  id: string;
  professionalId: string;
  professionalName: string;
  type: 'purchase' | 'spend' | 'adjustment';
  credits: number;
  label: string;
  at: string;
  orderId?: string;
  totalAed?: number;
};

export type CreditsOverview = {
  vatRate: number;
  packs: CreditPackage[];
  promos: PromoCode[];
  transactions: CreditLedgerEntry[];
  stats: {
    totalCreditsInWallets: number;
    purchaseCount: number;
    spendCount: number;
  };
};

export type AdjustCreditsInput = {
  professionalId: string;
  credits: number;
  label?: string;
};

export type CatalogService = {
  id: number;
  name: string;
  active: boolean;
};

export type CreateServiceInput = {
  name: string;
};

export type UpdateServiceInput = {
  name?: string;
  active?: boolean;
};

export type VerificationStatus = 'none' | 'pending' | 'verified' | 'rejected';

export type ProfessionalTxn = {
  id: string;
  type: 'purchase' | 'spend' | 'adjustment';
  credits: number;
  label: string;
  at: string;
};

export type ProServiceRate = {
  session: string;
  pack: string;
};

export type ProPricing = {
  rates: Record<string, ProServiceRate>;
  onlineMonthly: string;
  freeConsult: boolean;
  notes: string;
};

export type LeadPrefs = {
  goals: string[];
  clientGender: string[];
  ages: string[];
  days: string[];
  times: string[];
  languages: string[];
  formats: string[];
};

export type Professional = {
  id: string;
  name: string;
  email: string;
  phone: string;
  suspended: boolean;
  onboarded: boolean;
  createdAt: string;
  serviceIds: number[];
  locations: ('mine' | 'client' | 'online')[];
  radiusKm: number;
  certificationFiles: string[];
  insuranceFiles: string[];
  verification: VerificationStatus;
  verificationSubmittedAt: string | null;
  verificationRejectedReason: string | null;
  activated: boolean;
  pricing: ProPricing;
  leadPrefs: LeadPrefs;
  bio: string;
  credits: number;
  txns: ProfessionalTxn[];
  specialty: string;
  location: string;
  formats: string[];
  languages: string[];
  about: string;
  profileCertifications: string[];
  years: number;
  style: string;
  availability: string;
  priceFrom: string;
  gender: 'female' | 'male';
  rating: number;
  reviews: number;
  reviewList?: Array<{
    id: string;
    name: string;
    rating: number;
    text: string;
    source: string;
    date: string;
  }>;
  roi?: {
    creditsSpent: number;
    leadsUnlocked: number;
    clientsWon: number;
    revenue: number;
    conversionWeeks: number[];
    responseRateWeeks: number[];
  } | null;
  notificationPrefs: NotificationPrefs;
};

export type ProfessionalSummary = {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialty: string;
  location: string;
  serviceCount: number;
  verification: VerificationStatus;
  credits: number;
  activated: boolean;
  onboarded: boolean;
  suspended: boolean;
  profileCompletion: number;
};

export type UpdateProfessionalInput = {
  name?: string;
  email?: string;
  phone?: string;
  specialty?: string;
  location?: string;
  about?: string;
  years?: number;
  style?: string;
  availability?: string;
  priceFrom?: string;
  serviceIds?: number[];
  locations?: Professional['locations'];
  radiusKm?: number;
  activated?: boolean;
  suspended?: boolean;
};

export type ClientAnswers = {
  goal: string[];
  trainingType?: string;
  frequency?: string;
  startTraining?: string;
  days: string[];
  times: string[];
  timesOther?: string;
  routine?: string;
  routineOther?: string;
  coachGender?: string;
  style?: string;
  gender?: string;
  age?: string;
  ethnicity?: string;
  gymAccess?: string;
  languages: string[];
  location?: string;
  email?: string;
  phone?: string;
};

export type ClientConsents = {
  terms: boolean;
  privacy: boolean;
  independent: boolean;
  contact: boolean;
  acceptedAt: string | null;
};

export type OnlinePlanSummary = {
  id: string;
  name: string;
  goal: string;
  frequency: string;
  equipment: string;
  parq: string;
  status: string;
  since: string;
  dayCount: number;
  coachId: string;
  coachName: string;
  clientUserId: string | null;
  clientUserEmail: string | null;
  updatedAt: string;
};

export type OnlinePlanDetail = OnlinePlanSummary & {
  program: unknown;
  nutrition: unknown;
  progress: unknown;
  createdAt: string;
};

export type Client = {
  id: string;
  name: string;
  email: string;
  phone: string;
  onboarded: boolean;
  otpVerified: boolean;
  otpVerifiedAt: string | null;
  suspended: boolean;
  createdAt: string;
  lastActiveAt: string;
  answers: ClientAnswers;
  consents: ClientConsents;
  savedCoachIds: string[];
  onlinePlans?: OnlinePlanSummary[];
  requests?: QuoteRequestSummary[];
  note?: string;
  notificationPrefs: NotificationPrefs;
};

export type ClientSummary = {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  goals: string[];
  onboarded: boolean;
  otpVerified: boolean;
  suspended: boolean;
  savedCount: number;
  createdAt: string;
  lastActiveAt: string;
};

export type UpdateClientInput = {
  name?: string;
  email?: string;
  phone?: string;
  suspended?: boolean;
};

export type VerificationQueueItem = {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialty: string;
  location: string;
  submittedAt: string;
  certificationFiles: string[];
  insuranceFiles: string[];
  serviceIds: number[];
  profileCompletion: number;
  profileCertifications: string[];
};

export type RejectVerificationInput = {
  reason?: string;
};

export type LeadStatus = 'open' | 'closed';

export type LeadUnlock = {
  id: string;
  professionalId: string;
  credits: number;
  unlockedAt: string;
};

export type MarketplaceLead = {
  id: string;
  clientId: string;
  goal: string;
  serviceId: number;
  location: string;
  frequency: string;
  format: string;
  days: string;
  time: string;
  matchScore: number;
  creditCost: number;
  status: LeadStatus;
  postedAt: string;
  closedAt: string | null;
  clientNote: string;
  unlocks: LeadUnlock[];
};

export type LeadSummary = {
  id: string;
  clientId: string;
  clientName: string;
  goal: string;
  serviceId: number;
  service?: string;
  location: string;
  frequency?: string;
  format?: string;
  matchScore: number;
  creditCost: number;
  status: LeadStatus;
  unlockCount: number;
  postedAt: string;
};

export type LeadDetail = Omit<MarketplaceLead, 'unlocks'> & {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  unlocks: Array<
    LeadUnlock & {
      professionalName: string;
    }
  >;
};

export type UpdateLeadInput = {
  status?: LeadStatus;
  creditCost?: number;
};

export type QuoteRequestStatus = 'pending' | 'quoted' | 'closed';

export type QuoteRequest = {
  id: string;
  clientId: string;
  professionalId: string;
  status: QuoteRequestStatus;
  createdAt: string;
  quotedAt: string | null;
  closedAt: string | null;
  quoteMessage: string | null;
  quoteAmount: string | null;
};

export type QuoteRequestSummary = {
  id: string;
  clientId: string;
  clientName: string;
  professionalId: string;
  professionalName: string;
  professionalSpecialty: string;
  status: QuoteRequestStatus;
  createdAt: string;
};

export type QuoteRequestDetail = QuoteRequest & {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  professionalName: string;
  professionalSpecialty: string;
};

export type UpdateQuoteRequestInput = {
  status?: QuoteRequestStatus;
  quoteMessage?: string;
  quoteAmount?: string;
};

export type NotificationPrefs = {
  push: boolean;
  email: boolean;
  sms: boolean;
  matchUpdates: boolean;
  messages: boolean;
  marketing: boolean;
};

export type SupportTicketStatus = 'new' | 'replied' | 'closed';

export type SupportUserType = 'client' | 'professional';

export type SupportTicket = {
  id: string;
  userType: SupportUserType;
  userId: string;
  subject: string;
  body: string;
  status: SupportTicketStatus;
  replyNote: string | null;
  repliedAt: string | null;
  repliedBy: string | null;
  closedAt: string | null;
  createdAt: string;
};

export type SupportTicketSummary = {
  id: string;
  userType: SupportUserType;
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  status: SupportTicketStatus;
  createdAt: string;
  repliedAt: string | null;
};

export type SupportTicketDetail = SupportTicket & {
  userName: string;
  userEmail: string;
  userPhone: string;
  profileHref: string | null;
  notificationPrefs: NotificationPrefs;
};

export type UpdateSupportTicketInput = {
  status?: SupportTicketStatus;
  replyNote?: string;
  actorName?: string;
};

export type MessageAuthor = 'client' | 'professional' | 'system';

export type ChatMessage = {
  id: string;
  conversationId: string;
  author: MessageAuthor;
  body: string;
  sentAt: string;
};

export type Conversation = {
  id: string;
  clientId: string;
  professionalId: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
};

export type ConversationSummary = {
  id: string;
  clientId: string;
  clientName: string;
  professionalId: string;
  professionalName: string;
  professionalSpecialty: string;
  kind?: string;
  leadId?: string | null;
  lastMessage: string;
  lastMessageAt: string;
  messageCount: number;
};

export type ConversationDetail = Conversation & {
  clientName: string;
  clientEmail: string;
  professionalName: string;
  professionalEmail: string;
  professionalSpecialty: string;
  kind?: string;
  leadId?: string | null;
};

export type LegalDocId = 'terms' | 'privacy' | 'professional';

export type ContentLang = 'en' | 'ar';

export type LegalSection = {
  heading: string;
  body: string;
};

export type LegalDocument = {
  id: LegalDocId;
  lang: ContentLang;
  title: string;
  intro: string;
  sections: LegalSection[];
  updatedAt: string;
};

export type LegalDocumentSummary = {
  id: LegalDocId;
  label: string;
  enTitle: string;
  arTitle: string;
  sectionCount: number;
  updatedAt: string;
};

export type UpdateLegalDocumentInput = {
  title?: string;
  intro?: string;
  sections?: LegalSection[];
};

export type DashboardActivityKind =
  | 'client_signup'
  | 'pro_signup'
  | 'verification_pending'
  | 'lead_unlock'
  | 'credit_purchase'
  | 'support_ticket';

export type DashboardActivity = {
  id: string;
  kind: DashboardActivityKind;
  title: string;
  subtitle: string;
  at: string;
  href: string;
};

export type DashboardCounts = {
  pendingVerifications: number;
  openLeads: number;
  unlocksToday: number;
  clients: number;
  professionals: number;
  newClientsWeek: number;
  newProsWeek: number;
  creditsSoldAed: number;
  openSupportTickets: number;
};

export type DashboardOverview = {
  counts: DashboardCounts;
  recentActivity: DashboardActivity[];
};

export type {
  AppSettings,
  LookupGroupId,
  LookupGroupMeta,
  LookupOption,
} from './lookups';
