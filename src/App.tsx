import { useState } from 'react'
import './App.css'

type Step = 'email' | 'documents' | 'request'

function App() {
  const [activeStep, setActiveStep] = useState<Step>('email')

  const stepNumber =
    activeStep === 'email' ? 1 : activeStep === 'documents' ? 2 : 3

  const handleContinue = () => {
    if (activeStep === 'email') {
      setActiveStep('documents')
      return
    }

    if (activeStep === 'documents') {
      setActiveStep('request')
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <div className="brand-icon">B</div>

          <div>
            <p className="brand-name">BridgeCase</p>
            <p className="brand-tagline">
              Cross-border support, in your language
            </p>
          </div>
        </div>

        <button className="language-button" type="button">
          English
        </button>
      </header>

      <main className="main">
        <section className="hero">
          <div className="hero-label">
            Human-approved multilingual AI
          </div>

          <h1>
            Resolve consumer issues
            <span> in your own language.</span>
          </h1>

          <p className="hero-description">
            Turn receipts, emails, and rough notes into a clear case.
            Review every message in your language before anything is
            translated or sent.
          </p>

          <div className="trust-row">
            <div className="trust-item">
              <span className="check">✓</span>
              You approve every message
            </div>

            <div className="trust-item">
              <span className="check">✓</span>
              No automatic agreements
            </div>

            <div className="trust-item">
              <span className="check">✓</span>
              Important details stay locked
            </div>
          </div>
        </section>

        <section className="case-card">
          <div className="case-card-header">
            <div>
              <p className="eyebrow">NEW CASE</p>

              <h2>Tell us what happened</h2>

              <p>
                Add the original message, supporting documents, and the
                outcome you want.
              </p>
            </div>

            <div className="step-counter">
              Step {stepNumber} of 3
            </div>
          </div>

          <div className="step-tabs">
            <button
              className={activeStep === 'email' ? 'step active' : 'step'}
              onClick={() => setActiveStep('email')}
              type="button"
            >
              <span className="step-number">1</span>
              Original message
            </button>

            <button
              className={
                activeStep === 'documents' ? 'step active' : 'step'
              }
              onClick={() => setActiveStep('documents')}
              type="button"
            >
              <span className="step-number">2</span>
              Documents
            </button>

            <button
              className={activeStep === 'request' ? 'step active' : 'step'}
              onClick={() => setActiveStep('request')}
              type="button"
            >
              <span className="step-number">3</span>
              Your request
            </button>
          </div>

          <div className="form-area">
            {activeStep === 'email' && (
              <>
                <label htmlFor="email-content">
                  Paste the email or message you received
                </label>

                <p className="field-help">
                  Include the sender, recipient, subject, and date if
                  available.
                </p>

                <textarea
                  id="email-content"
                  placeholder="Paste the original email or support message here..."
                />

                <div className="privacy-note">
                  <span className="privacy-icon">✓</span>

                  <div>
                    <strong>You stay in control.</strong>

                    <p>
                      BridgeCase will identify facts, claims, and missing
                      information. Nothing will be sent without your
                      approval.
                    </p>
                  </div>
                </div>
              </>
            )}

            {activeStep === 'documents' && (
              <>
                <label>Upload supporting documents</label>

                <p className="field-help">
                  Add receipts, invoices, or other evidence related to this
                  case.
                </p>

                <button className="upload-box" type="button">
                  <span className="upload-icon">↑</span>
                  <strong>Choose PDF or image files</strong>
                  <span>Up to 3 files, 20 pages total</span>
                </button>
              </>
            )}

            {activeStep === 'request' && (
              <>
                <label htmlFor="request-content">
                  What would you like the company to do?
                </label>

                <p className="field-help">
                  Write naturally in your own language. A rough explanation
                  is enough.
                </p>

                <textarea
                  id="request-content"
                  placeholder="For example: I canceled this subscription, but I was charged again. I want the latest charge refunded and future billing stopped."
                />
              </>
            )}

            <div className="form-actions">
              <button className="secondary-button" type="button">
                Save for later
              </button>

              {activeStep !== 'request' ? (
                <button
                  className="primary-button"
                  type="button"
                  onClick={handleContinue}
                >
                  Continue
                  <span>→</span>
                </button>
              ) : (
                <button className="primary-button" type="button">
                  Analyze case
                  <span>→</span>
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="how-it-works">
          <p className="eyebrow">HOW IT WORKS</p>

          <h2>AI prepares. You decide.</h2>

          <div className="feature-grid">
            <article className="feature">
              <div className="feature-number">01</div>

              <h3>Evidence grounded</h3>

              <p>
                BridgeCase separates verified facts, your claims, and
                information that still needs confirmation.
              </p>
            </article>

            <article className="feature">
              <div className="feature-number">02</div>

              <h3>Review in your language</h3>

              <p>
                Read and edit the complete message in your own language
                before translation.
              </p>
            </article>

            <article className="feature">
              <div className="feature-number">03</div>

              <h3>Meaning stays locked</h3>

              <p>
                Amounts, dates, requested outcomes, and approval conditions
                stay consistent across languages.
              </p>
            </article>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App