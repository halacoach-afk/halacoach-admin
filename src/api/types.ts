export type AdminPermission =
  | 'dashboard:read'
  | 'verification:read'
  | 'verification:write'
  | 'professionals:read'
  | 'professionals:write'
  | 'clients:read'
  | 'clients:write'
  | 'leads:read'
  | 'leads:write'
  | 'credits:read'
  | 'credits:write'
  | 'credits:adjust'
  | 'services:read'
  | 'services:write'
  | 'support:read'
  | 'support:write'
  | 'settings:read'
  | 'settings:write'
  | 'messages:read'
  | 'admins:read'
  | 'admins:write'
  | 'activity:read';

export type AdminRole = string;

export type AdminUser = {
  id: number;
  name: string;
  email: string;
  role: AdminRole;
  active: boolean;
  lastLogin: string | null;
  createdAt: string;
  customPermissions?: AdminPermission[] | null;
  usesCustomPermissions?: boolean;
};

export type AdminUserDetail = AdminUser & {
  rolePermissions: AdminPermission[];
  effectivePermissions: AdminPermission[];
  catalog: AdminPermissionCatalogItem[];
};

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  role: AdminRole;
  permissions?: AdminPermission[];
};

export type AdminRoleRecord = {
  id: number;
  slug: string;
  name: string;
  permissions: AdminPermission[];
  isSystem: boolean;
  /** Super admin - cannot be edited or deleted. */
  isLocked?: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

export type AdminPermissionCatalogItem = {
  key: AdminPermission;
  module: string;
  action: string;
  label: string;
};

export type AdminRolesResponse = {
  roles: AdminRoleRecord[];
  catalog: AdminPermissionCatalogItem[];
};

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
  /** null = inherit role; array = custom override */
  permissions?: AdminPermission[] | null;
};

export type CreditPlanBadge = 'popular' | 'value';
export type CreditPlanType = 'one_time' | 'membership';
/** @deprecated Prefer CreditPlanBadge */
export type CreditPackageBadge = CreditPlanBadge;
/** @deprecated Prefer CreditPlanType */
export type CreditPackageType = CreditPlanType;

export type CreditBenefitKind =
  | 'founding_badge'
  | 'unlock_credit_discount'
  | 'free_unlocks';

export type CreditBenefit = {
  id: number;
  title: string;
  type: CreditBenefitKind;
  value: number | null;
};

export type CreditPlanBenefitAssignment = {
  id: number;
  title: string;
  type: CreditBenefitKind;
  value: number | null;
};

export type CreditPlan = {
  id: number;
  name: string;
  type?: CreditPlanType;
  credits: number;
  price: number;
  badge?: CreditPlanBadge;
  sortOrder: number;
  active: boolean;
  purchaseLimit?: number | null;
  maxPurchases?: number | null;
  benefits?: CreditPlanBenefitAssignment[];
};
/** @deprecated Prefer CreditPlan */
export type CreditPackage = CreditPlan;

export type CreateCreditPlanInput = {
  name: string;
  type?: CreditPlanType;
  credits: number;
  price: number;
  badge?: CreditPlanBadge | null;
  purchaseLimit?: number | null;
  maxPurchases?: number | null;
  benefitIds?: number[];
};
/** @deprecated Prefer CreateCreditPlanInput */
export type CreateCreditPackageInput = CreateCreditPlanInput;

export type UpdateCreditPlanInput = {
  name?: string;
  type?: CreditPlanType;
  credits?: number;
  price?: number;
  badge?: CreditPlanBadge | null;
  active?: boolean;
  purchaseLimit?: number | null;
  maxPurchases?: number | null;
  benefitIds?: number[];
};
/** @deprecated Prefer UpdateCreditPlanInput */
export type UpdateCreditPackageInput = UpdateCreditPlanInput;

export type CreditSubscriptionAdmin = {
  id: string;
  userId: number;
  professionalId: string;
  professionalName: string;
  professionalEmail: string | null;
  professionalPhone: string | null;
  planId: string;
  status: string;
  startedAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  canceledAt: string | null;
  nextGrantAt: string | null;
  provider: string | null;
  providerSubscriptionId: string | null;
  plan: {
    id: string;
    name: string;
    type?: string;
    credits: number;
    price: number;
    badge?: CreditPlanBadge | null;
  } | null;
};

export type CreditSubscriptionTxn = {
  id: number;
  type: string;
  credits: number;
  label: string;
  kind: string | null;
  createdAt: string | null;
};

export type CreditSubscriptionDetail = CreditSubscriptionAdmin & {
  transactions: CreditSubscriptionTxn[];
};

export type FoundingMemberSource = 'membership' | 'trial_pack';

export type FoundingMemberBenefit = {
  id: number;
  type: string;
  title: string;
  value: number | null;
};

export type FoundingMember = {
  userId: number;
  professionalId: string;
  name: string;
  email: string;
  phone: string | null;
  joinedAt: string;
  sources: FoundingMemberSource[];
  /** Credit plan / pack names that conferred founding. */
  bundles: string[];
  membershipStatus: 'active' | 'canceled' | 'expired' | 'past_due' | 'none';
  benefits: FoundingMemberBenefit[];
  freeUnlocksGranted: number;
  freeUnlocksRemaining: number;
  freeUnlocksConsumed: number;
  discountedUnlocksConsumed: number;
  activeDiscountPercent: number;
};

export type FoundingMembersResponse = {
  data: FoundingMember[];
  meta: {total: number};
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
  professionalEmail?: string | null;
  type: 'purchase' | 'spend' | 'adjustment' | 'membership_grant' | 'expiry';
  credits: number;
  label: string;
  at: string;
  orderId?: string;
  totalAed?: number;
};

export type PaginationMeta = {
  page: number;
  perPage: number;
  total: number;
  lastPage: number;
};

export type Paginated<T> = {
  data: T[];
  meta: PaginationMeta;
  counts?: Record<string, number>;
};

export type CreditsOverview = {
  vatRate: number;
  packs: CreditPlan[];
  promos: PromoCode[];
  transactions: CreditLedgerEntry[];
  meta?: PaginationMeta;
  counts?: {
    all: number;
    credited: number;
    spent: number;
  };
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
  nameAr?: string | null;
  active: boolean;
  sortOrder?: number;
};

export type CreateServiceInput = {
  name: string;
  nameAr?: string | null;
};

export type UpdateServiceInput = {
  name?: string;
  nameAr?: string | null;
  active?: boolean;
};

export type ReorderServicesInput = {
  orderedIds: number[];
};

export type VerificationStatus = 'none' | 'pending' | 'verified' | 'rejected';

export type VerificationDocType =
  | 'reps_uae'
  | 'muahal'
  | 'ministry_or_federation'
  | 'cpr_aed'
  | 'insurance'
  | 'additional_certs'
  | 'trade_licence';

export type VerificationDocStatus =
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected';

export type VerificationDisplayStatus = VerificationDocStatus | 'expiring_soon';

export type VerificationDocTypeMeta = {
  id: VerificationDocType;
  label: string;
  description: string;
  required: boolean;
};

export type VerificationFile = {
  id: string;
  originalName: string;
  storedName: string;
  mime: string;
  size: number;
  docType?: VerificationDocType | null;
  status?: VerificationDocStatus;
  displayStatus?: VerificationDisplayStatus;
  expiresAt?: string | null;
  rejectedReason?: string | null;
  reviewedAt?: string | null;
  expiringSoon?: boolean;
};

export type ProfessionalTxn = {
  id: string;
  type: 'purchase' | 'spend' | 'adjustment' | 'membership_grant' | 'expiry';
  credits: number;
  label: string;
  at: string;
  /** Pack name or derived source label. */
  source?: string | null;
  packName?: string | null;
  promoCode?: string | null;
  /** Amount charged in AED (purchases / membership grants). */
  totalAed?: number | null;
  orderId?: string | null;
  /** Best available payment / order / subscription reference. */
  reference?: string | null;
  paymentMethod?: string | null;
  /** e.g. completed | test | failed */
  paymentStatus?: string | null;
  fakePayment?: boolean;
  /** Admin adjustment direction when type is `adjustment`. */
  direction?: 'in' | 'out' | null;
};

export type ProServiceRate = {
  session: string;
  pack: string;
  packSessions: string;
};

export type ProPricing = {
  rates: Record<string, ProServiceRate>;
  onlineMonthly: string;
  freeConsult: boolean;
  notes: string;
};

export type MatchPrefs = {
  /**
   * Shared catalog service ids.
   * Client: services they want | Coach: services they provide.
   */
  services: string[];
  formats: string[];
  frequency?: string;
  days: string[];
  times: string[];
  timesOther?: string;
  gender?: string;
  style?: string;
  ages: string[];
  languages: string[];
  startTraining?: string;
  routine?: string;
  routineOther?: string;
};

export type PersonalProfile = {
  gender?: string | null;
  birth_date?: string | null;
  gymAccess?: string | null;
  location?: string | null;
  locationLatitude?: number | null;
  locationLongitude?: number | null;
  bio?: string | null;
  years?: string | null;
};

export type Professional = {
  id: string;
  name: string;
  email: string;
  phone: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  suspended: boolean;
  deletedAt?: string | null;
  /** Bought Founding Premium Pro and/or founding trial credit pack. */
  isFoundingProfessional?: boolean;
  createdAt: string;
  lastActiveAt?: string;
  serviceIds: number[];
  locations: ('coach' | 'client' | 'online' | 'online_live')[];
  radiusKm: number;
  verificationFiles: VerificationFile[];
  verificationStatus: VerificationStatus;
  verificationSubmittedAt: string | null;
  verificationRejectedReason: string | null;
  activated: boolean;
  pricing: ProPricing;
  matchPrefs: MatchPrefs;
  bio: string;
  /** @deprecated Prefer `notes`. */
  adminNotes?: string;
  /** @deprecated Prefer per-note followUpAt. */
  adminFollowUpAt?: string | null;
  /** Admin CRM notes (newest first). */
  notes?: ProfessionalAdminNote[];
  credits: number;
  txns: ProfessionalTxn[];
  specialty: string;
  location: string;
  formats: string[];
  languages: string[];
  about: string;
  profileCertifications: string[];
  years: number;
  /** Raw experience band from profile, e.g. `8-10`. */
  yearsExperience?: string;
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
    leadsWon: number;
    leadsWonUnlocked: number;
    conversionWeeks: number[];
  } | null;
  notificationPrefs: NotificationPrefs;
  profileCompletion?: number | ProfileCompletionPayload;
};

export type ProfileCompletionPayload = {
  percent: number;
  items: Array<{
    id: string;
    done: boolean;
    fields?: Array<{id: string; done: boolean; optional?: boolean}>;
  }>;
};

export type ProfessionalSummary = {
  id: string;
  name: string;
  email: string;
  phone: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  specialty: string;
  services?: string[];
  location: string;
  /** Experience band id from coach profile, e.g. `8-10`. */
  years: string;
  about: string;
  serviceCount: number;
  verificationStatus: VerificationStatus;
  credits: number;
  activated: boolean;
  suspended: boolean;
  deletedAt?: string | null;
  /** Bought Founding Premium Pro and/or founding trial credit pack. */
  isFoundingProfessional?: boolean;
  profileCompletion: number | ProfileCompletionPayload;
  createdAt: string;
  lastActiveAt: string;
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
  suspended?: boolean;
};

export type ProfessionalAdminNote = {
  id: string;
  body: string;
  followUpAt: string | null;
  createdByAdminId: string | null;
  createdByName?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UpsertProfessionalNoteInput = {
  body: string;
  /** YYYY-MM-DD or empty string to clear. */
  followUpAt?: string;
};

export type ClientConsents = {
  terms: boolean;
  privacy: boolean;
  independent: boolean;
  contact: boolean;
  acceptedAt: string | null;
};

export type OnlinePlanSummary = {
  id: number;
  name: string;
  goal: string;
  frequency: string;
  equipment: string;
  parq: string;
  status: string;
  since: string;
  dayCount: number;
  coachId: number;
  coachName: string;
  clientUserId: string | null;
  clientUserEmail: string | null;
  leadId: number;
  updatedAt: string;
};

export type OnlinePlanRevision = {
  id: number;
  onlinePlanId: number;
  version: number;
  publishedBy: number | null;
  publishedAt: string | null;
  program: unknown;
  nutrition: unknown;
  intake: unknown;
  summary: {
    trainingDays: number;
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fats: number | null;
  };
};

export type OnlinePlanDetail = OnlinePlanSummary & {
  program: unknown;
  nutrition: unknown;
  progress: unknown;
  intake: unknown;
  approvedAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  revisions: OnlinePlanRevision[];
  parqQuestions: Array<{id: string; prompt: string}>;
};

export type Client = {
  id: string;
  name: string;
  email: string;
  phone: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  birthDate?: string | null;
  otpVerified: boolean;
  otpVerifiedAt: string | null;
  suspended: boolean;
  deletedAt?: string | null;
  createdAt: string;
  lastActiveAt: string;
  matchPrefs: MatchPrefs;
  profile: PersonalProfile;
  consents: ClientConsents;
  onlinePlans?: OnlinePlanSummary[];
  note?: string;
  notificationPrefs: NotificationPrefs;
  profileCompletion?: number | ProfileCompletionPayload;
};

export type ClientSummary = {
  id: string;
  name: string;
  email: string;
  phone: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  birthDate: string | null;
  location: string;
  services: string[];
  otpVerified: boolean;
  suspended: boolean;
  deletedAt?: string | null;
  profileCompletion: number | ProfileCompletionPayload;
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
  verificationStatus?: VerificationStatus;
  verificationRejectedReason?: string | null;
  verificationFiles: VerificationFile[];
  serviceIds: number[];
  profileCompletion: number | ProfileCompletionPayload;
  profileCertifications: string[];
};

export type VerificationQueueResponse = {
  documentTypes: VerificationDocTypeMeta[];
  items: VerificationQueueItem[];
  meta?: PaginationMeta;
  counts?: Record<string, number>;
};

export type RejectVerificationInput = {
  reason?: string;
  reasons?: Array<{
    fileId: string;
    reason: string;
  }>;
};

export type LeadLifecycleStatus =
  | 'open'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'deleted';

export type LeadStatus = 'open' | 'closed';

export type LeadUnlock = {
  id: string;
  professionalId: string;
  credits: number;
  matchPercent?: number | null;
  unlockedAt: string;
};

export type MarketplaceLead = {
  id: number;
  clientId: string;
  goal: string;
  goalDetail?: string | null;
  serviceId: number;
  service?: string;
  location: string;
  frequency: string;
  format: string;
  days: string;
  time: string;
  formatId?: string | null;
  frequencyId?: string | null;
  dayIds?: string[];
  timeIds?: string[];
  timesOther?: string | null;
  startTraining?: string | null;
  routine?: string | null;
  routineOther?: string | null;
  gender?: string | null;
  style?: string | null;
  languages?: string[];
  ages?: string[];
  radiusKm?: number | null;
  status: LeadStatus;
  leadStatus?: LeadLifecycleStatus;
  assignedCoachId?: string | null;
  assignedCoachName?: string | null;
  assignedCoachEmail?: string | null;
  assignedCoachPhone?: string | null;
  /** website | android | ios */
  source?: string | null;
  postedAt: string;
  closedAt: string | null;
  clientNote: string;
  unlocks: LeadUnlock[];
};

export type LeadSummary = {
  id: number;
  clientId: string;
  clientName: string;
  goal: string;
  goalDetail?: string | null;
  serviceId: number;
  service?: string;
  location: string;
  frequency?: string;
  format?: string;
  days?: string;
  time?: string;
  formatId?: string | null;
  frequencyId?: string | null;
  dayIds?: string[];
  timeIds?: string[];
  timesOther?: string | null;
  startTraining?: string | null;
  routine?: string | null;
  routineOther?: string | null;
  gender?: string | null;
  style?: string | null;
  languages?: string[];
  ages?: string[];
  radiusKm?: number | null;
  status: LeadStatus;
  leadStatus?: LeadLifecycleStatus;
  unlockCount: number;
  unlockCreditsTotal?: number;
  assignedCoachId?: string | null;
  assignedCoachName?: string | null;
  /** website | android | ios */
  source?: string | null;
  postedAt: string;
};

export type LeadNotifiedProfessional = {
  id: string;
  professionalId: string;
  professionalName: string;
  professionalEmail?: string | null;
  matchPercent: number | null;
  /** Credits to unlock at this match % (same formula as marketplace). */
  unlockCost?: number | null;
  notifiedAt: string;
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
  /** Coaches who received a match-notify for this lead. */
  notifiedProfessionals?: LeadNotifiedProfessional[];
};

export type UpdateLeadInput = {
  status?: LeadStatus;
};

export type NotificationPrefs = {
  push: boolean;
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
};

export type SupportTicketStatus = 'new' | 'in_progress' | 'closed';

export type SupportUserType = 'client' | 'professional' | 'guest';

export type SupportTicket = {
  id: number;
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
  id: number;
  userType: SupportUserType;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  subject: string;
  body: string;
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
  /** Goal / catalog service for the conversation. */
  goal?: string;
  /** @deprecated Prefer `goal`. */
  professionalSpecialty: string;
  leadId?: number | null;
  lastMessage: string;
  lastMessageAt: string;
  messageCount: number;
};

export type ConversationDetail = Conversation & {
  clientName: string;
  clientEmail: string;
  professionalName: string;
  professionalEmail: string;
  /** Goal / catalog service for the conversation. */
  goal?: string;
  /** @deprecated Prefer `goal`. */
  professionalSpecialty: string;
  leadId?: number | null;
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

/** Action-required counts for admin sidebar badges. */
export type NavBadges = {
  pendingVerifications: number;
  openSupportTickets: number;
};

export type ActivityLogEntityRef = {
  type: string;
  id: string;
};

export type ActivityLogEntry = {
  id: string;
  event: string;
  actorType: 'user' | 'admin' | 'system' | string;
  actorKind?: 'system' | 'admin' | 'coach' | 'client' | 'user' | string | null;
  actorId: string | null;
  actorName: string | null;
  payload: Record<string, unknown>;
  entities: ActivityLogEntityRef[];
  occurredAt: string | null;
};

export type ListActivityLogsParams = {
  page?: number;
  perPage?: number;
  id?: string | number;
  event?: string;
  events?: string[];
  actorType?: string;
  actorKind?: string;
  actorId?: string | number;
  actorName?: string;
  entityType?: string;
  entityId?: string | number;
  from?: string;
  to?: string;
};
