'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { clearSurveyData, getStoredSurveyValues } from '../lib/surveyStorage';
import { Question, Questionnaire } from '../lib/models';

const defaultQuestionnaire: Questionnaire = {
  slug: 'dpht-master-wellness-questionnaire',
  title: 'DIVINE POWER HOLISTIC THERAPY (DPHT)',
  description: 'Healthcare without medicine: complete this guided holistic wellness questionnaire.',
  questions: [
    {
      key: 'name',
      label: 'Full name',
      type: 'text',
      required: true,
      placeholder: 'Your name',
      category: 'Profile',
    },
    {
      key: 'email',
      label: 'Email address',
      type: 'email',
      required: true,
      placeholder: 'you@example.com',
      category: 'Contact',
    },
    {
      key: 'stressLevel',
      label: 'Current stress level',
      type: 'select',
      options: ['Low', 'Moderate', 'High'],
      category: 'Wellbeing',
    },
    {
      key: 'sleepQuality',
      label: 'Sleep quality',
      type: 'select',
      options: ['Poor', 'Fair', 'Good'],
      category: 'Recovery',
    },
    {
      key: 'energy',
      label: 'Energy levels',
      type: 'select',
      options: ['Low', 'Moderate', 'High'],
      category: 'Recovery',
    },
  ],
};

function isQuestionAnswered(value: unknown, question: Question) {
  if (question.type === 'checkbox') {
    return Array.isArray(value) && value.length > 0;
  }

  if (question.type === 'rating' || question.type === 'number') {
    return value !== '' && value !== null && value !== undefined;
  }

  return value !== '' && value !== null && value !== undefined;
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
  const surveyCardRef = useRef<HTMLDivElement>(null);
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [activeSlug, setActiveSlug] = useState<string>(defaultQuestionnaire.slug);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

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
          setActiveSlug(normalized[0]?.slug || defaultQuestionnaire.slug);
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
      setStatus('Your answers were submitted successfully.');
    } catch (err) {
      console.error(err);
      setStatus(err instanceof Error ? err.message : 'Unable to save your answers. Please check your server setup.');
    } finally {
      setSending(false);
    }
  }

  function renderInput(question: Question) {
    const rawValue = values[question.key];

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
          placeholder={question.placeholder ?? ''}
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
    return <p>Loading questionnaires…</p>;
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
            {renderInput(currentQuestion)}
            {currentQuestion.helpText ? <p className="question-help">{currentQuestion.helpText}</p> : null}
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
              disabled={!isQuestionAnswered(values[currentQuestion.key], currentQuestion)}
              className="primary-button"
            >
              Next question
            </button>
          ) : (
            <button type="button" onClick={handleSubmit} disabled={sending} className="primary-button">
              {sending ? 'Submitting…' : 'Submit answers'}
            </button>
          )}
        </div>

        {status && <p className="status">{status}</p>}
        {error && <p className="error">{error}</p>}
      </form>
    </div>
  );
}
