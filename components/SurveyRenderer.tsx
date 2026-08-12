'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearSurveyData, getStoredSurveyValues } from '../lib/surveyStorage';
import { Question, Questionnaire } from '../lib/models';
import LoadingSpinner from './ui/LoadingSpinner';
import { InlineSpinner } from './ui/LoadingSpinner';
import fallbackQuestionnaires from '../scripts/questionnaires.json';

type PlanItem = {
  id: string;
  name: string;
  details: string;
  description: string;
  durationWeeks: number;
  costInr: number;
};

const fallbackPlans: PlanItem[] = [
  {
    id: 'trial',
    name: '1 Week Trial',
    details: 'Trial of 4-week transformation path',
    description: 'Introductory plan to begin your DPHT journey.',
    durationWeeks: 1,
    costInr: 1000,
  },
  {
    id: 'visible',
    name: '4 Weeks Plan',
    details: 'Visible Improvement',
    description: 'Focused support for visible improvement in 30 days.',
    durationWeeks: 4,
    costInr: 3000,
  },
  {
    id: 'consistent',
    name: '12 Weeks Plan',
    details: 'Consistent',
    description: 'Structured progression for consistency and momentum.',
    durationWeeks: 12,
    costInr: 10000,
  },
  {
    id: 'reversal',
    name: '25 Weeks Plan',
    details: 'Reversal Of Symptoms',
    description: 'Longer care cycle aimed at deeper symptom reversal.',
    durationWeeks: 25,
    costInr: 18000,
  },
  {
    id: 'complete',
    name: '52 Weeks Plan',
    details: 'Completely Healthy',
    description: 'Comprehensive long-term lifestyle transformation plan.',
    durationWeeks: 52,
    costInr: 35000,
  },
];

function formatInr(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

const defaultQuestionnaire: Questionnaire =
  (Array.isArray(fallbackQuestionnaires) && (fallbackQuestionnaires[0] as Questionnaire)) || {
    slug: 'dpht-master-wellness-questionnaire',
    title: 'DIVINE POWER HOLISTIC THERAPY (DPHT) FOR HEALTHCARE WITHOUT MEDICINE',
    description: 'Healthcare without medicine: complete this guided holistic wellness questionnaire.',
    questions: [],
  };

function isQuestionAnswered(value: unknown, question: Question) {
  if (question.type === 'info') {
    return true;
  }

  if (question.type === 'checkbox') {
    return Array.isArray(value) && value.length > 0;
  }

  if (question.type === 'rating' || question.type === 'number') {
    return value !== '' && value !== null && value !== undefined;
  }

  return value !== '' && value !== null && value !== undefined;
}

function normalizeIndianPhone(value: string) {
  const compact = value.replace(/[\s()-]/g, '');
  if (compact.startsWith('+91')) {
    return compact.slice(3);
  }
  if (compact.startsWith('91') && compact.length === 12) {
    return compact.slice(2);
  }
  return compact;
}

function isValidIndianPhone(value: string) {
  const normalized = normalizeIndianPhone(value);
  return /^[6-9]\d{9}$/.test(normalized);
}

function renderInfoText(text: string) {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const bullets = lines.filter((line) => line.startsWith('- ')).map((line) => line.slice(2));
  const paragraphs = lines.filter((line) => !line.startsWith('- '));

  return { bullets, paragraphs };
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getBmiInsights(values: Record<string, unknown>) {
  const heightCm = toNumber(values.personal_height_cm);
  const weightKg = toNumber(values.personal_weight_kg);

  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) {
    return null;
  }

  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);

  let categoryLabel = 'obese';
  let riskLabel = 'high';

  if (bmi < 18.5) {
    categoryLabel = 'underweight';
    riskLabel = 'moderate';
  } else if (bmi < 25) {
    categoryLabel = 'normal';
    riskLabel = 'low';
  } else if (bmi < 30) {
    categoryLabel = 'overweight';
    riskLabel = 'moderate to high';
  } else {
    categoryLabel = 'obese';
    riskLabel = 'high';
  }

  return {
    bmi: Number(bmi.toFixed(1)),
    categoryLabel,
    riskLabel,
  };
}

function useQuestionnaireState(questionnaire: Questionnaire | null) {
  const [values, setValues] = useState<Record<string, any>>({});

  useEffect(() => {
    const saved = getStoredSurveyValues() || {};
    const questionDefaults = questionnaire?.questions.reduce<Record<string, any>>((acc, question) => {
      const savedValue = saved[question.key];
      if (savedValue !== undefined) {
        acc[question.key] = savedValue;
      } else if (question.type === 'checkbox') {
        acc[question.key] = [];
      } else {
        acc[question.key] = '';
      }
      return acc;
    }, {}) ?? {};

    setValues(questionDefaults);
  }, [questionnaire]);

  function updateValue(key: string, value: any) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function toggleCheckbox(key: string, option: string) {
    setValues((current) => {
      const currentList: string[] = Array.isArray(current[key]) ? current[key] : [];
      const exists = currentList.includes(option);
      const nextList = exists ? currentList.filter((o) => o !== option) : [...currentList, option];
      return { ...current, [key]: nextList };
    });
  }

  return { values, updateValue, toggleCheckbox };
}

export default function SurveyRenderer() {
  const router = useRouter();
  const surveyCardRef = useRef<HTMLDivElement>(null);
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [activeSlug, setActiveSlug] = useState<string>(defaultQuestionnaire.slug);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [plans, setPlans] = useState<PlanItem[]>(fallbackPlans);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch('/api/questionnaires');
        if (!response.ok) {
          throw new Error('Unable to load questionnaires');
        }

        const results = await response.json();
        if (Array.isArray(results) && results.length > 0) {
          const normalized = results.map((item: any) => ({
            slug: item.slug || item._id || defaultQuestionnaire.slug,
            title: item.title || defaultQuestionnaire.title,
            description: item.description || defaultQuestionnaire.description,
            questions: Array.isArray(item.questions) ? item.questions : defaultQuestionnaire.questions,
            _id: item._id,
          }));
          setQuestionnaires(normalized as Questionnaire[]);
          const preferred = normalized.find((item: any) => item.slug === defaultQuestionnaire.slug);
          setActiveSlug(preferred?.slug || normalized[0]?.slug || defaultQuestionnaire.slug);
        } else {
          setQuestionnaires([defaultQuestionnaire]);
          setActiveSlug(defaultQuestionnaire.slug);
        }
      } catch (err) {
        console.error(err);
        setError('Unable to load questionnaires. Please check your server setup.');
        setQuestionnaires([defaultQuestionnaire]);
        setActiveSlug(defaultQuestionnaire.slug);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadPlans() {
      try {
        const response = await fetch('/api/plans', { cache: 'no-store' });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          return;
        }

        const list = Array.isArray(payload?.plans) ? (payload.plans as PlanItem[]) : [];
        if (!cancelled && list.length > 0) {
          setPlans(list);
        }
      } catch {
        // Keep fallback plans when API is unavailable.
      }
    }

    loadPlans();

    return () => {
      cancelled = true;
    };
  }, []);

  const activeQuestionnaire = useMemo(
    () => questionnaires.find((questionnaire) => questionnaire.slug === activeSlug) ?? questionnaires[0] ?? defaultQuestionnaire,
    [activeSlug, questionnaires]
  );

  const { values, updateValue, toggleCheckbox } = useQuestionnaireState(activeQuestionnaire);

  useEffect(() => {
    setCurrentQuestionIndex(0);
    setValidationError(null);
  }, [activeQuestionnaire.slug]);

  const currentQuestion = activeQuestionnaire.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === activeQuestionnaire.questions.length - 1;
  const isMultiSelectQuestion = currentQuestion.type === 'checkbox';
  const sections = useMemo(() => {
    const grouped = new Map<string, { name: string; start: number; end: number }>();

    activeQuestionnaire.questions.forEach((question, index) => {
      const sectionName = question.category?.trim() || 'General';
      const existing = grouped.get(sectionName);
      if (existing) {
        existing.end = index;
        return;
      }

      grouped.set(sectionName, {
        name: sectionName,
        start: index,
        end: index,
      });
    });

    return Array.from(grouped.values());
  }, [activeQuestionnaire.questions]);

  const currentSectionIndex = sections.findIndex(
    (section) => currentQuestionIndex >= section.start && currentQuestionIndex <= section.end,
  );

  const completedSections = sections.filter((section, index) => {
    if (currentQuestionIndex > section.end) {
      return true;
    }

    if (index === currentSectionIndex && currentQuestionIndex === section.end) {
      return isQuestionAnswered(values[currentQuestion.key], currentQuestion);
    }

    return false;
  }).length;

  function scrollToTop() {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }

    surveyCardRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
  }

  useEffect(() => {
    scrollToTop();
  }, [currentQuestionIndex, activeQuestionnaire.slug]);

  function handleNext() {
    if (currentQuestion.required && !isQuestionAnswered(values[currentQuestion.key], currentQuestion)) {
      setValidationError('Please answer this question before continuing.');
      return;
    }

    if (currentQuestion.type === 'phone') {
      const phoneValue = String(values[currentQuestion.key] ?? '').trim();
      if (phoneValue && !isValidIndianPhone(phoneValue)) {
        setValidationError('Please enter a valid Indian mobile number.');
        return;
      }
    }

    setValidationError(null);
    setCurrentQuestionIndex((current) => Math.min(current + 1, activeQuestionnaire.questions.length - 1));
    scrollToTop();
  }

  function handlePrevious() {
    setValidationError(null);
    setCurrentQuestionIndex((current) => Math.max(current - 1, 0));
    scrollToTop();
  }

  async function handleSubmit() {
    setStatus(null);
    setSending(true);
    setValidationError(null);

    const missingQuestion = activeQuestionnaire.questions.find(
      (question) => question.required && !isQuestionAnswered(values[question.key], question),
    );

    if (missingQuestion) {
      setValidationError(`Please answer: ${missingQuestion.label}`);
      setCurrentQuestionIndex(activeQuestionnaire.questions.indexOf(missingQuestion));
      scrollToTop();
      setSending(false);
      return;
    }

    const phoneQuestion = activeQuestionnaire.questions.find((question) => question.type === 'phone');
    if (phoneQuestion) {
      const phoneValue = String(values[phoneQuestion.key] ?? '').trim();
      if (phoneValue && !isValidIndianPhone(phoneValue)) {
        setValidationError('Please enter a valid Indian mobile number.');
        setCurrentQuestionIndex(activeQuestionnaire.questions.indexOf(phoneQuestion));
        scrollToTop();
        setSending(false);
        return;
      }
    }

    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionnaireSlug: activeQuestionnaire.slug,
          questionnaireTitle: activeQuestionnaire.title,
          values,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Submission failed');
      }

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(
          'healthifi-submission',
          JSON.stringify({
            questionnaireSlug: activeQuestionnaire.slug,
            questionnaireTitle: activeQuestionnaire.title,
            values,
            submittedAt: new Date().toISOString(),
          }),
        );
      }

      clearSurveyData();
      router.push('/thank-you');
    } catch (err) {
      console.error(err);
      setStatus(err instanceof Error ? err.message : 'Unable to save your answers. Please check your server setup.');
    } finally {
      setSending(false);
    }
  }

  function renderInput(question: Question) {
    const rawValue = values[question.key];

    if (question.type === 'info') {
      const infoText = question.helpText || '';
      const { bullets, paragraphs } = renderInfoText(infoText);
      const isBmiCard = question.key.toLowerCase().includes('bmi');
      const isFinalPlanCard = question.key === 'final_plan_info';
      const bmiInsights = isBmiCard ? getBmiInsights(values) : null;
      const resolvedParagraphs = isBmiCard
        ? paragraphs.map((line) => {
            if (line.includes('is ___')) {
              return `Your Body Mass Index (BMI) is ${bmiInsights ? bmiInsights.bmi : '__'}.`;
            }

            if (line.toLowerCase().includes('obese range')) {
              return bmiInsights
                ? `which is in the ${bmiInsights.categoryLabel} range.`
                : 'which is in the __ range.';
            }

            if (line.toLowerCase().includes('risk of unhealthy bmi ___')) {
              return `Risk of unhealthy BMI ${bmiInsights ? bmiInsights.riskLabel : '__'}.`;
            }

            if (line.includes('ideally your BMI should be ___')) {
              return 'Your personal profile Body Mass Index BMI is __ ideally your BMI should be 18.5-24.9.';
            }

            if (line.includes('BMI range of __')) {
              return 'The National Institute of Health (NHI) recommends the BMI range of 18.5-24.9 to be within the health range.';
            }

            return line;
          })
        : paragraphs;

      return (
        <div className="info-panel">
          {isBmiCard ? (
            <div className="bmi-panel-head">
              <div className="bmi-summary">
                <div className="bmi-metric">
                  <span className="bmi-metric-label">BMI</span>
                  <strong>{bmiInsights ? bmiInsights.bmi : '--'}</strong>
                </div>
                <div className="bmi-metric">
                  <span className="bmi-metric-label">Category</span>
                  <strong>{bmiInsights ? bmiInsights.categoryLabel : '--'}</strong>
                </div>
                <div className="bmi-metric">
                  <span className="bmi-metric-label">Risk</span>
                  <strong>{bmiInsights ? bmiInsights.riskLabel : '--'}</strong>
                </div>
              </div>
              <div className="bmi-scale">
                <span>18.5</span>
                <span>25</span>
                <span>30</span>
                <div className="bmi-scale-line" />
              </div>
            </div>
          ) : null}
          {bullets.length > 0 ? (
            <ul>
              {bullets.map((line, index) => (
                <li key={`${line}-${index}`}>{line}</li>
              ))}
            </ul>
          ) : null}
          {isFinalPlanCard ? (
            <div className="plan-grid survey-plan-grid">
              {plans.map((plan) => (
                <article className="plan-card" key={plan.id}>
                  <h3>{plan.name}</h3>
                  <p><strong>{plan.details}</strong></p>
                  <p>{plan.description}</p>
                  <p>Duration: {plan.durationWeeks} week{plan.durationWeeks > 1 ? 's' : ''}</p>
                  <p>Cost: {formatInr(plan.costInr)}</p>
                </article>
              ))}
            </div>
          ) : (
            resolvedParagraphs.map((line, index) => (
              <p key={`${line}-${index}`}>{line}</p>
            ))
          )}
          {isBmiCard && !bmiInsights ? (
            <p className="bmi-note">Fill Height and Current Weight to auto-calculate BMI.</p>
          ) : null}
        </div>
      );
    }

    if (question.type === 'textarea') {
      return (
        <textarea
          value={rawValue ?? ''}
          placeholder={question.placeholder ?? ''}
          onChange={(event) => updateValue(question.key, event.target.value)}
          rows={4}
        />
      );
    }

    if (question.type === 'select') {
      return (
        <select value={rawValue ?? ''} onChange={(event) => updateValue(question.key, event.target.value)}>
          <option value="">Choose an option</option>
          {question.options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    if (question.type === 'radio' || question.type === 'likert') {
      return (
        <div className="radio-group">
          {question.options?.map((option) => (
            <label key={option} className="radio-option">
              <input
                type="radio"
                name={question.key}
                value={option}
                checked={rawValue === option}
                onChange={(event) => updateValue(question.key, event.target.value)}
              />
              {option}
            </label>
          ))}
        </div>
      );
    }

    if (question.type === 'checkbox') {
      const list: string[] = Array.isArray(rawValue) ? rawValue : [];
      return (
        <div className="checkbox-group">
          {question.options?.map((option) => (
            <label key={option} className="checkbox-option">
              <input
                type="checkbox"
                name={`${question.key}[]`}
                value={option}
                checked={list.includes(option)}
                onChange={() => toggleCheckbox(question.key, option)}
              />
              {option}
            </label>
          ))}
        </div>
      );
    }

    if (question.type === 'rating') {
      const min = question.minValue ?? 1;
      const max = question.maxValue ?? 10;
      const val = rawValue === '' || rawValue === undefined ? Math.round((min + max) / 2) : Number(rawValue);
      return (
        <div className="rating-input">
          <input
            type="range"
            min={String(min)}
            max={String(max)}
            value={String(val)}
            onChange={(e) => updateValue(question.key, Number(e.target.value))}
          />
          <div className="rating-value">{val}</div>
        </div>
      );
    }

    if (question.type === 'number') {
      const isAgeQuestion = question.key.toLowerCase().includes('age');

      if (isAgeQuestion) {
        const min = question.minValue ?? 1;
        const max = question.maxValue ?? 120;
        const selectedValue = rawValue === '' || rawValue === undefined ? '' : String(rawValue);
        return (
          <select value={selectedValue} onChange={(event) => updateValue(question.key, Number(event.target.value))}>
            <option value="">Select age</option>
            {Array.from({ length: max - min + 1 }, (_, index) => min + index).map((age) => (
              <option key={age} value={age}>
                {age}
              </option>
            ))}
          </select>
        );
      }

      return (
        <input
          type="number"
          value={rawValue ?? ''}
          min={question.minValue}
          max={question.maxValue}
          step={question.step}
          placeholder={question.placeholder ?? ''}
          onChange={(event) => updateValue(question.key, Number(event.target.value))}
        />
      );
    }

    if (question.type === 'phone') {
      return (
        <input
          type="tel"
          value={rawValue ?? ''}
          placeholder={question.placeholder ?? 'Enter 10-digit Indian mobile number'}
          inputMode="numeric"
          maxLength={14}
          onChange={(event) => updateValue(question.key, event.target.value)}
        />
      );
    }

    return (
      <input
        type={question.type === 'email' ? 'email' : 'text'}
        value={rawValue ?? ''}
        placeholder={question.placeholder ?? ''}
        onChange={(event) => updateValue(question.key, event.target.value)}
      />
    );
  }

  if (loading) {
    return <LoadingSpinner message="Loading questionnaires..." />;
  }

  return (
    <div className="survey-card" ref={surveyCardRef}>
      <form>
        <div className="question-card">
          <div className="question-topbar">
            <span className="question-badge">{currentQuestion.category ?? 'General'}</span>
            <div className="question-progress">
              <div className="progress-label">Section progress</div>
              <div className="section-progress" aria-label="Section progress tracker">
                {sections.map((section, index) => {
                  const isComplete = index < completedSections;
                  const isActive = index === currentSectionIndex;
                  const connectorClass = index < sections.length - 1 && index < completedSections ? 'section-line complete' : 'section-line';

                  return (
                    <div key={section.name} className="section-item" title={section.name}>
                      <span className={`section-dot${isComplete ? ' complete' : ''}${isActive ? ' active' : ''}`} />
                      {index < sections.length - 1 ? <span className={connectorClass} /> : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <label className="question-label">
            <span>{currentQuestion.label}</span>
            {isMultiSelectQuestion ? <p className="question-subhint">Select all that are applicable.</p> : null}
            {currentQuestion.type === 'info' ? <p className="question-subhint">Review and continue.</p> : null}
            {renderInput(currentQuestion)}
            {currentQuestion.helpText && currentQuestion.type !== 'info' ? <p className="question-help">{currentQuestion.helpText}</p> : null}
          </label>
        </div>

        {validationError && <p className="validation-error">{validationError}</p>}

        <div className="survey-actions">
          <button type="button" onClick={handlePrevious} disabled={currentQuestionIndex === 0} className="secondary-button">
            Previous
          </button>

          {!isLastQuestion ? (
            <button 
              type="button" 
              onClick={handleNext} 
              disabled={Boolean(currentQuestion.required) && !isQuestionAnswered(values[currentQuestion.key], currentQuestion)}
              className="primary-button"
            >
              Next question
            </button>
          ) : (
            <button type="button" onClick={handleSubmit} disabled={sending} className="primary-button">
              {sending ? <InlineSpinner label="Submitting..." /> : 'Submit answers'}
            </button>
          )}
        </div>

        {status && <p className="status">{status}</p>}
        {error && <p className="error">{error}</p>}
      </form>
    </div>
  );
}
