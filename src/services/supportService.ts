import { Lang } from '@/constants/i18n';
import { getDeviceId, getSupabaseClient } from '@/services/supabaseService';
import { getItem, setItem, STORAGE_KEYS } from '@/services/storageService';

export type SupportDonationMethod =
  | 'none'
  | 'bri'
  | 'mandiri'
  | 'ewallet'
  | 'other';

export interface SupportSubmissionInput {
  name: string;
  message: string;
  donationMethod: SupportDonationMethod;
  donationMethodLabel: string;
  donationAccountName?: string;
  donationAccountNumber?: string;
  language: Lang;
}

export interface SupportSubmission extends SupportSubmissionInput {
  id: string;
  deviceId: string;
  createdAt: string;
  synced: boolean;
}

const createLocalId = (): string =>
  `support_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;

async function saveSupportSubmissionLocal(submission: SupportSubmission): Promise<void> {
  const existing = (await getItem<SupportSubmission[]>(STORAGE_KEYS.SUPPORT_SUBMISSIONS)) ?? [];
  await setItem(STORAGE_KEYS.SUPPORT_SUBMISSIONS, [submission, ...existing].slice(0, 100));
}

export async function getLocalSupportSubmissions(): Promise<SupportSubmission[]> {
  return (await getItem<SupportSubmission[]>(STORAGE_KEYS.SUPPORT_SUBMISSIONS)) ?? [];
}

export async function submitSupportForm(input: SupportSubmissionInput): Promise<{ synced: boolean }> {
  const name = input.name.trim();
  const message = input.message.trim();
  const deviceId = await getDeviceId();
  const submission: SupportSubmission = {
    ...input,
    name,
    message,
    donationMethodLabel: input.donationMethodLabel.trim(),
    donationAccountName: input.donationAccountName?.trim() || undefined,
    donationAccountNumber: input.donationAccountNumber?.trim() || undefined,
    id: createLocalId(),
    deviceId,
    createdAt: new Date().toISOString(),
    synced: false,
  };

  const client = await getSupabaseClient();
  if (!client) {
    await saveSupportSubmissionLocal(submission);
    return { synced: false };
  }

  const { error } = await client.from('support_messages').insert({
    device_id: deviceId,
    name,
    message,
    donation_method: input.donationMethod,
    donation_method_label: input.donationMethodLabel,
    donation_account_name: input.donationAccountName ?? null,
    donation_account_number: input.donationAccountNumber ?? null,
    app_language: input.language,
  });

  if (error) {
    await saveSupportSubmissionLocal(submission);
    return { synced: false };
  }

  await saveSupportSubmissionLocal({ ...submission, synced: true });
  return { synced: true };
}
