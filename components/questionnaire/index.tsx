'use client';

// Task 7 — Seller questionnaire: 3-step form
// Step 1: Collection details (storage type, location, count, restorations)
// Step 2: Contact information (name, email, phone, state, city, zip)
// Step 3: Timeline and notes
// On submit: returns validated SellerQuestionnaire to parent via onSubmit prop

import { useState } from 'react';
import { SellerQuestionnaireSchema } from '@/lib/schemas/questionnaire';
import {
  STORAGE_TYPE_LABELS,
  STORAGE_LOCATION_LABELS,
  TIMELINE_LABELS,
} from '@/lib/schemas/questionnaire';
import type { SellerQuestionnaire } from '@/lib/schemas/questionnaire';
import { SERVICE_STATES } from '@/lib/config/constants';
import { isBelowMinimum, BELOW_MINIMUM_NOTICE } from '@/lib/utils/collection-size';

// ---------------------------------------------------------------------------
// State labels for the dropdown
// ---------------------------------------------------------------------------

const STATE_NAMES: Record<(typeof SERVICE_STATES)[number], string> = {
  CT: 'Connecticut',
  MA: 'Massachusetts',
  RI: 'Rhode Island',
  NH: 'New Hampshire',
  VT: 'Vermont',
  ME: 'Maine',
  NY: 'New York',
  NJ: 'New Jersey',
  PA: 'Pennsylvania',
  FL: 'South Florida',
};

// ---------------------------------------------------------------------------
// Shared field components
// ---------------------------------------------------------------------------

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700">
      {children}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-600">{message}</p>;
}

function TextInput({
  id,
  label,
  type = 'text',
  value,
  onChange,
  error,
  placeholder,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={[
          'mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm',
          'focus:outline-none focus:ring-2 focus:ring-blue-500',
          error ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white',
        ].join(' ')}
      />
      <FieldError message={error} />
    </div>
  );
}

function RadioGroup<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  error,
}: {
  legend: string;
  name: string;
  options: { value: T; label: string }[];
  value: T | '';
  onChange: (v: T) => void;
  error?: string;
}) {
  return (
    <fieldset>
      <legend className="block text-sm font-medium text-gray-700">{legend}</legend>
      <div className="mt-2 space-y-2">
        {options.map((opt) => (
          <label key={opt.value} className="flex cursor-pointer items-center gap-2.5">
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">{opt.label}</span>
          </label>
        ))}
      </div>
      <FieldError message={error} />
    </fieldset>
  );
}

function CheckboxField({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      <div>
        <span className="text-sm font-medium text-gray-700">{label}</span>
        {description && <p className="text-xs text-gray-500">{description}</p>}
      </div>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Draft type — all fields optional during editing
// ---------------------------------------------------------------------------

type Draft = {
  name: string;
  email: string;
  phone: string;
  state: string;
  city: string;
  zip: string;
  estimated_count: string; // string for input binding, parsed on validation
  storage_type: string;
  storage_location: string;
  known_restorations: boolean;
  timeline: string;
  pickup_available: boolean;
  notes: string;
};

type FieldErrors = Partial<Record<keyof SellerQuestionnaire | 'estimated_count', string>>;

const EMPTY_DRAFT: Draft = {
  name: '',
  email: '',
  phone: '',
  state: '',
  city: '',
  zip: '',
  estimated_count: '',
  storage_type: '',
  storage_location: '',
  known_restorations: false,
  timeline: '',
  pickup_available: false,
  notes: '',
};

// ---------------------------------------------------------------------------
// Per-step validation (subset of the full schema)
// ---------------------------------------------------------------------------

function validateStep1(d: Draft): FieldErrors {
  const errors: FieldErrors = {};
  const count = parseInt(d.estimated_count, 10);
  if (!d.estimated_count || isNaN(count)) {
    errors.estimated_count = 'Enter an estimated number of books';
  } else if (count < 1) {
    errors.estimated_count = 'Enter at least 1 book';
  }
  if (!d.storage_type) errors.storage_type = 'Select how your books are stored';
  if (!d.storage_location) errors.storage_location = 'Select the storage environment';
  return errors;
}

function validateStep2(d: Draft): FieldErrors {
  const errors: FieldErrors = {};
  if (!d.name || d.name.trim().length < 2) errors.name = 'Full name is required';
  if (!d.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email))
    errors.email = 'A valid email address is required';
  if (!d.phone || d.phone.replace(/\D/g, '').length < 10)
    errors.phone = 'Phone number must be at least 10 digits';
  if (!d.state) errors.state = 'Select a state we serve';
  if (!d.city.trim()) errors.city = 'City is required';
  if (!/^\d{5}$/.test(d.zip)) errors.zip = 'ZIP code must be 5 digits';
  return errors;
}

function validateStep3(d: Draft): FieldErrors {
  const errors: FieldErrors = {};
  if (!d.timeline) errors.timeline = 'Select a timeline';
  return errors;
}

// ---------------------------------------------------------------------------
// Step components
// ---------------------------------------------------------------------------

function Step1({
  draft,
  errors,
  onChange,
}: {
  draft: Draft;
  errors: FieldErrors;
  onChange: (patch: Partial<Draft>) => void;
}) {
  const parsedCount = parseInt(draft.estimated_count, 10);
  // Soft gate: notice only. Submission is never blocked on collection size —
  // the operator sees `below_minimum` on the internal notification and decides.
  const showMinimumNotice =
    !errors.estimated_count && !isNaN(parsedCount) && parsedCount >= 1 && isBelowMinimum(parsedCount);

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="estimated_count">Approximately how many comics are in your collection?</Label>
        <input
          id="estimated_count"
          type="number"
          min={1}
          value={draft.estimated_count}
          onChange={(e) => onChange({ estimated_count: e.target.value })}
          placeholder="e.g. 500"
          className={[
            'mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm',
            'focus:outline-none focus:ring-2 focus:ring-blue-500',
            errors.estimated_count ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white',
          ].join(' ')}
        />
        <FieldError message={errors.estimated_count} />
        {showMinimumNotice && (
          <p
            role="status"
            className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800 ring-1 ring-amber-200"
          >
            {BELOW_MINIMUM_NOTICE}
          </p>
        )}
      </div>

      <RadioGroup
        legend="How are your comics stored?"
        name="storage_type"
        options={Object.entries(STORAGE_TYPE_LABELS).map(([v, label]) => ({
          value: v as SellerQuestionnaire['storage_type'],
          label,
        }))}
        value={draft.storage_type as SellerQuestionnaire['storage_type'] | ''}
        onChange={(v) => onChange({ storage_type: v })}
        error={errors.storage_type}
      />

      <RadioGroup
        legend="Where are they stored?"
        name="storage_location"
        options={Object.entries(STORAGE_LOCATION_LABELS).map(([v, label]) => ({
          value: v as SellerQuestionnaire['storage_location'],
          label,
        }))}
        value={draft.storage_location as SellerQuestionnaire['storage_location'] | ''}
        onChange={(v) => onChange({ storage_location: v })}
        error={errors.storage_location}
      />

      <CheckboxField
        id="known_restorations"
        label="Some books have been pressed, cleaned, or professionally restored"
        description="Disclosure helps us make an accurate offer. This doesn't disqualify the collection."
        checked={draft.known_restorations}
        onChange={(v) => onChange({ known_restorations: v })}
      />
    </div>
  );
}

function Step2({
  draft,
  errors,
  onChange,
}: {
  draft: Draft;
  errors: FieldErrors;
  onChange: (patch: Partial<Draft>) => void;
}) {
  return (
    <div className="space-y-4">
      <TextInput
        id="name"
        label="Full name"
        value={draft.name}
        onChange={(v) => onChange({ name: v })}
        error={errors.name}
        placeholder="Jane Smith"
      />
      <TextInput
        id="email"
        label="Email address"
        type="email"
        value={draft.email}
        onChange={(v) => onChange({ email: v })}
        error={errors.email}
        placeholder="jane@example.com"
      />
      <TextInput
        id="phone"
        label="Phone number"
        type="tel"
        value={draft.phone}
        onChange={(v) => onChange({ phone: v })}
        error={errors.phone}
        placeholder="(555) 000-0000"
      />

      <div>
        <Label htmlFor="state">State</Label>
        <select
          id="state"
          value={draft.state}
          onChange={(e) => onChange({ state: e.target.value })}
          className={[
            'mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm',
            'focus:outline-none focus:ring-2 focus:ring-blue-500',
            errors.state ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white',
          ].join(' ')}
        >
          <option value="">Select a state…</option>
          {SERVICE_STATES.map((s) => (
            <option key={s} value={s}>
              {STATE_NAMES[s]}
            </option>
          ))}
        </select>
        <FieldError message={errors.state} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <TextInput
          id="city"
          label="City"
          value={draft.city}
          onChange={(v) => onChange({ city: v })}
          error={errors.city}
          placeholder="Hartford"
        />
        <TextInput
          id="zip"
          label="ZIP code"
          value={draft.zip}
          onChange={(v) => onChange({ zip: v })}
          error={errors.zip}
          placeholder="06101"
        />
      </div>
    </div>
  );
}

function Step3({
  draft,
  errors,
  onChange,
}: {
  draft: Draft;
  errors: FieldErrors;
  onChange: (patch: Partial<Draft>) => void;
}) {
  return (
    <div className="space-y-6">
      <RadioGroup
        legend="What's your selling timeline?"
        name="timeline"
        options={Object.entries(TIMELINE_LABELS).map(([v, label]) => ({
          value: v as SellerQuestionnaire['timeline'],
          label,
        }))}
        value={draft.timeline as SellerQuestionnaire['timeline'] | ''}
        onChange={(v) => onChange({ timeline: v })}
        error={errors.timeline}
      />

      <CheckboxField
        id="pickup_available"
        label="You can come pick up the collection from my location"
        description="We travel to you — this helps us plan the appointment."
        checked={draft.pickup_available}
        onChange={(v) => onChange({ pickup_available: v })}
      />

      <div>
        <Label htmlFor="notes">Anything else we should know? (optional)</Label>
        <textarea
          id="notes"
          rows={3}
          value={draft.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          maxLength={500}
          placeholder="Special circumstances, questions, or anything that might help us prepare…"
          className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="mt-1 text-right text-xs text-gray-400">
          {draft.notes.length} / 500
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step header
// ---------------------------------------------------------------------------

const STEPS = [
  { number: 1, title: 'Your Collection' },
  { number: 2, title: 'Contact Info' },
  { number: 3, title: 'Timeline' },
];

function StepHeader({ current }: { current: number }) {
  return (
    <nav aria-label="Questionnaire progress" className="mb-6">
      <ol className="flex items-center gap-0">
        {STEPS.map((step, idx) => {
          const isComplete = current > step.number;
          const isActive = current === step.number;
          return (
            <li key={step.number} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <div
                  className={[
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold',
                    isComplete
                      ? 'bg-blue-600 text-white'
                      : isActive
                        ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-600'
                        : 'bg-gray-100 text-gray-400',
                  ].join(' ')}
                >
                  {isComplete ? '✓' : step.number}
                </div>
                <span
                  className={[
                    'mt-1 text-xs font-medium',
                    isActive ? 'text-blue-700' : 'text-gray-400',
                  ].join(' ')}
                >
                  {step.title}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={[
                    'mb-4 h-0.5 flex-1 mx-1',
                    isComplete ? 'bg-blue-600' : 'bg-gray-200',
                  ].join(' ')}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export interface QuestionnaireProps {
  onSubmit: (data: SellerQuestionnaire) => void;
}

export default function Questionnaire({ onSubmit }: QuestionnaireProps) {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<FieldErrors>({});

  function patch(partial: Partial<Draft>) {
    setDraft((prev) => ({ ...prev, ...partial }));
    // Clear errors for changed keys
    const cleared = Object.fromEntries(
      Object.keys(partial).map((k) => [k, undefined]),
    );
    setErrors((prev) => ({ ...prev, ...cleared }));
  }

  function handleNext() {
    const validate = step === 1 ? validateStep1 : step === 2 ? validateStep2 : validateStep3;
    const errs = validate(draft);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setStep((s) => s + 1);
  }

  function handleBack() {
    setErrors({});
    setStep((s) => s - 1);
  }

  function handleSubmit() {
    const errs = validateStep3(draft);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    // Parse and validate through full Zod schema
    const result = SellerQuestionnaireSchema.safeParse({
      ...draft,
      estimated_count: parseInt(draft.estimated_count, 10),
      notes: draft.notes || undefined,
    });

    if (!result.success) {
      // Map Zod errors back to field errors
      const zodErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof SellerQuestionnaire;
        if (field) zodErrors[field] = issue.message;
      }
      setErrors(zodErrors);
      return;
    }

    onSubmit(result.data);
  }

  return (
    <div className="mx-auto max-w-lg">
      <StepHeader current={step} />

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        {step === 1 && <Step1 draft={draft} errors={errors} onChange={patch} />}
        {step === 2 && <Step2 draft={draft} errors={errors} onChange={patch} />}
        {step === 3 && <Step3 draft={draft} errors={errors} onChange={patch} />}

        {/* Navigation */}
        <div className="mt-8 flex justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              ← Back
            </button>
          ) : (
            <span />
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Next →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              className="rounded-md bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              Get My Offer →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
