import React, { FormEvent, useId, useMemo, useState } from 'react';

export interface ResiliencyAlertSignupProps {
  eyebrow?: string;
  heading?: string;
  summary?: string;
  benefits?: string;
  label?: string;
  placeholder?: string;
  buttonLabel?: string;
  privacyNote?: string;
  endpointUrl?: string;
  source?: string;
  resourceType?: string;
  successMessage?: string;
  errorMessage?: string;
  className?: string;
}

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

const palette = {
  ink: '#251c18',
  muted: '#6f6760',
  mutedStrong: '#4b433d',
  green: '#225f3f',
  greenDark: '#194d34',
  greenSoft: '#edf5ef',
  border: '#e7e2dc',
  borderStrong: '#d7d2cc',
  surface: '#ffffff',
  subtle: '#f7f5f1',
  error: '#9f2f25',
};

const defaultBenefits = [
  'New report releases',
  'Supply disruption signals',
  'Procurement response notes',
];

const parseBenefits = (value?: string): string[] => {
  if (!value?.trim()) {
    return defaultBenefits;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch {
    // Fall back to plain text parsing so editors can use comma or newline lists.
  }

  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const isLikelyEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const componentCss = `
  .cato-alert-signup {
    box-sizing: border-box;
    width: 100%;
    color: ${palette.ink};
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .cato-alert-signup *,
  .cato-alert-signup *::before,
  .cato-alert-signup *::after {
    box-sizing: border-box;
  }

  .cato-alert-signup__card {
    width: 100%;
    padding: 28px;
    background: ${palette.surface};
    border: 1px solid ${palette.border};
    border-radius: 8px;
    box-shadow: 0 18px 44px rgba(37, 28, 24, 0.06);
  }

  .cato-alert-signup__pill {
    display: inline-flex;
    align-items: center;
    width: auto;
    max-width: 100%;
    min-height: 24px;
    padding: 3px 12px;
    margin-bottom: 14px;
    border: 1px solid ${palette.borderStrong};
    border-radius: 999px;
    background: ${palette.subtle};
    color: ${palette.mutedStrong};
    font-size: 12px;
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: 0;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .cato-alert-signup__heading {
    margin: 0;
    color: ${palette.ink};
    font-size: 28px;
    font-weight: 500;
    line-height: 1.18;
    letter-spacing: 0;
  }

  .cato-alert-signup__summary {
    max-width: 620px;
    margin: 10px 0 0;
    color: ${palette.muted};
    font-size: 16px;
    line-height: 1.55;
    letter-spacing: 0;
  }

  .cato-alert-signup__benefits {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 16px 0 18px;
    padding: 0;
    list-style: none;
  }

  .cato-alert-signup__benefit {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    max-width: 100%;
    min-height: 28px;
    padding: 4px 12px;
    border: 1px solid ${palette.borderStrong};
    border-radius: 999px;
    background: ${palette.greenSoft};
    color: ${palette.greenDark};
    font-size: 13px;
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: 0;
  }

  .cato-alert-signup__dot {
    width: 6px;
    height: 6px;
    flex: 0 0 auto;
    border-radius: 999px;
    background: #56bf7f;
  }

  .cato-alert-signup__field {
    display: grid;
    gap: 8px;
  }

  .cato-alert-signup__label {
    color: ${palette.ink};
    font-size: 15px;
    font-weight: 700;
    line-height: 1.3;
    letter-spacing: 0;
  }

  .cato-alert-signup__row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 12px;
    align-items: stretch;
  }

  .cato-alert-signup__input {
    width: 100%;
    min-height: 52px;
    padding: 0 16px;
    border: 1px solid ${palette.border};
    border-radius: 8px;
    background: ${palette.surface};
    color: ${palette.ink};
    font: inherit;
    font-size: 16px;
    line-height: 1.2;
    outline: none;
    transition: border-color 160ms ease, box-shadow 160ms ease;
  }

  .cato-alert-signup__input::placeholder {
    color: #a59f99;
  }

  .cato-alert-signup__input:hover {
    border-color: ${palette.borderStrong};
  }

  .cato-alert-signup__input:focus-visible {
    border-color: ${palette.green};
    box-shadow: 0 0 0 3px rgba(34, 95, 63, 0.14);
  }

  .cato-alert-signup__button {
    min-height: 52px;
    padding: 0 24px;
    border: 1px solid ${palette.green};
    border-radius: 8px;
    background: ${palette.green};
    color: #ffffff;
    font: inherit;
    font-size: 15px;
    font-weight: 700;
    line-height: 1.2;
    white-space: nowrap;
    cursor: pointer;
    transition: background-color 160ms ease, border-color 160ms ease, transform 160ms ease, box-shadow 160ms ease;
  }

  .cato-alert-signup__button:hover:not(:disabled) {
    background: ${palette.greenDark};
    border-color: ${palette.greenDark};
    box-shadow: 0 10px 24px rgba(25, 77, 52, 0.18);
    transform: translateY(-1px);
  }

  .cato-alert-signup__button:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(34, 95, 63, 0.2), 0 10px 24px rgba(25, 77, 52, 0.18);
  }

  .cato-alert-signup__button:disabled {
    cursor: wait;
    opacity: 0.72;
  }

  .cato-alert-signup__note,
  .cato-alert-signup__status {
    margin: 10px 0 0;
    color: ${palette.muted};
    font-size: 14px;
    line-height: 1.45;
    letter-spacing: 0;
  }

  .cato-alert-signup__status {
    padding: 10px 12px;
    border-radius: 8px;
  }

  .cato-alert-signup__status--success {
    background: ${palette.greenSoft};
    color: ${palette.greenDark};
  }

  .cato-alert-signup__status--error {
    background: #fff1ef;
    color: ${palette.error};
  }

  @media (max-width: 720px) {
    .cato-alert-signup__card {
      padding: 22px;
    }

    .cato-alert-signup__heading {
      font-size: 24px;
    }

    .cato-alert-signup__summary {
      font-size: 15px;
    }

    .cato-alert-signup__row {
      grid-template-columns: 1fr;
    }

    .cato-alert-signup__button {
      width: 100%;
    }
  }
`;

export const ResiliencyAlertSignup: React.FC<ResiliencyAlertSignupProps> = ({
  eyebrow = 'Email alerts',
  heading = 'Receive new Resiliency Report Alerts.',
  summary = 'Get healthcare supply risk signals, disruption reports, and sourcing notes as they publish.',
  benefits,
  label = 'Work email address',
  placeholder = 'you@organization.com',
  buttonLabel = 'Subscribe to alerts',
  privacyNote = 'No spam. Unsubscribe anytime.',
  endpointUrl = '',
  source = 'resiliency-reports',
  resourceType = 'Resiliency Report Alerts',
  successMessage = 'Thanks. You are on the Resiliency Report Alerts list.',
  errorMessage = 'Something went wrong. Please try again.',
  className = '',
}) => {
  const inputId = useId();
  const statusId = `${inputId}-status`;
  const [email, setEmail] = useState('');
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [message, setMessage] = useState('');
  const benefitItems = useMemo(() => parseBenefits(benefits), [benefits]);
  const isSubmitting = submitState === 'submitting';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim();

    if (!isLikelyEmail(normalizedEmail)) {
      setSubmitState('error');
      setMessage('Enter a valid work email address.');
      return;
    }

    setSubmitState('submitting');
    setMessage('');

    if (!endpointUrl.trim()) {
      setSubmitState('success');
      setMessage(successMessage);
      return;
    }

    try {
      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: normalizedEmail,
          source,
          resourceType,
          consent: true,
          submittedAt: new Date().toISOString(),
          pageUrl: typeof window === 'undefined' ? '' : window.location.href,
        }),
      });

      if (!response.ok) {
        throw new Error(`Subscription endpoint returned ${response.status}`);
      }

      setSubmitState('success');
      setMessage(successMessage);
      setEmail('');
    } catch {
      setSubmitState('error');
      setMessage(errorMessage);
    }
  };

  return (
    <form
      className={`cato-alert-signup ${className}`.trim()}
      onSubmit={handleSubmit}
      aria-describedby={message ? statusId : undefined}
    >
      <style>{componentCss}</style>
      <div className="cato-alert-signup__card">
        {eyebrow ? <div className="cato-alert-signup__pill">{eyebrow}</div> : null}
        {heading ? <h2 className="cato-alert-signup__heading">{heading}</h2> : null}
        {summary ? <p className="cato-alert-signup__summary">{summary}</p> : null}

        {benefitItems.length ? (
          <ul className="cato-alert-signup__benefits" aria-label="Alert coverage">
            {benefitItems.map((item) => (
              <li className="cato-alert-signup__benefit" key={item}>
                <span className="cato-alert-signup__dot" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="cato-alert-signup__field">
          <label className="cato-alert-signup__label" htmlFor={inputId}>
            {label}
          </label>
          <div className="cato-alert-signup__row">
            <input
              id={inputId}
              className="cato-alert-signup__input"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder={placeholder}
              required
              value={email}
              disabled={isSubmitting}
              onChange={(event) => {
                setEmail(event.currentTarget.value);
                if (submitState !== 'idle') {
                  setSubmitState('idle');
                  setMessage('');
                }
              }}
            />
            <button className="cato-alert-signup__button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Subscribing...' : buttonLabel}
            </button>
          </div>
        </div>

        {privacyNote ? <p className="cato-alert-signup__note">{privacyNote}</p> : null}
        {message ? (
          <p
            id={statusId}
            className={`cato-alert-signup__status cato-alert-signup__status--${submitState}`}
            role={submitState === 'error' ? 'alert' : 'status'}
          >
            {message}
          </p>
        ) : null}
      </div>
    </form>
  );
};

export default ResiliencyAlertSignup;
