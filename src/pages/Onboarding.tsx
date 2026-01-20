import { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Smartphone,
  Database,
  Download,
  Upload,
  Rocket,
  ChevronRight,
  X,
  Share,
  MoreVertical,
  Plus,
  Monitor,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useCatalogStore } from '../stores/catalogStore';

type DeviceType = 'ios' | 'android' | 'desktop';

/**
 * Detect the current device type based on user agent
 */
const detectDeviceType = (): DeviceType => {
  const ua = navigator.userAgent.toLowerCase();
  
  // Check for iOS (iPhone, iPad, iPod)
  if (/iphone|ipad|ipod/.test(ua)) {
    return 'ios';
  }
  
  // Check for Android
  if (/android/.test(ua)) {
    return 'android';
  }
  
  // Default to desktop
  return 'desktop';
};

interface OnboardingStep {
  icon: React.ReactNode;
  title: string;
  description: string;
  content: React.ReactNode;
}

export const Onboarding = () => {
  const navigate = useNavigate();
  const updateSettings = useCatalogStore((state) => state.updateSettings);
  const [currentStep, setCurrentStep] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const minSwipeDistance = 50;
  const deviceType = useMemo(() => detectDeviceType(), []);

  // iOS installation instructions
  const iOSInstructions = (
    <div className="bg-[var(--color-surface-elevated)] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded bg-gradient-to-b from-gray-400 to-gray-600 flex items-center justify-center">
          <span className="text-white text-xs font-bold">iOS</span>
        </div>
        <span className="font-semibold text-[var(--color-text)]">iPhone / iPad</span>
      </div>
      <ol className="space-y-2 text-sm text-[var(--color-text-muted)]">
        <li className="flex items-start gap-2">
          <span className="text-[var(--color-primary)] font-bold">1.</span>
          <span>Tap the <Share className="w-4 h-4 inline text-blue-400" /> Share button in Safari</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-[var(--color-primary)] font-bold">2.</span>
          <span>Scroll down and tap <strong className="text-[var(--color-text)]">"Add to Home Screen"</strong></span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-[var(--color-primary)] font-bold">3.</span>
          <span>Tap <strong className="text-[var(--color-text)]">"Add"</strong> to confirm</span>
        </li>
      </ol>
    </div>
  );

  // Android installation instructions
  const androidInstructions = (
    <div className="bg-[var(--color-surface-elevated)] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded bg-gradient-to-b from-green-400 to-green-600 flex items-center justify-center">
          <span className="text-white text-xs font-bold">A</span>
        </div>
        <span className="font-semibold text-[var(--color-text)]">Android</span>
      </div>
      <ol className="space-y-2 text-sm text-[var(--color-text-muted)]">
        <li className="flex items-start gap-2">
          <span className="text-[var(--color-primary)] font-bold">1.</span>
          <span>Tap the <MoreVertical className="w-4 h-4 inline text-[var(--color-text)]" /> menu in Chrome</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-[var(--color-primary)] font-bold">2.</span>
          <span>Tap <strong className="text-[var(--color-text)]">"Install app"</strong> or <Plus className="w-4 h-4 inline" /> <strong className="text-[var(--color-text)]">"Add to Home screen"</strong></span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-[var(--color-primary)] font-bold">3.</span>
          <span>Tap <strong className="text-[var(--color-text)]">"Install"</strong> to confirm</span>
        </li>
      </ol>
    </div>
  );

  // Desktop notice
  const desktopNotice = (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-400/20 flex items-center justify-center flex-shrink-0">
          <Monitor className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h4 className="font-semibold text-amber-400 mb-1">Desktop Not Recommended</h4>
          <p className="text-sm text-[var(--color-text-muted)]">
            This app is designed for <strong className="text-[var(--color-text)]">mobile devices</strong>. For the best experience, please open this page on your phone.
          </p>
        </div>
      </div>
    </div>
  );

  // Get install content based on device type
  const getInstallContent = () => {
    switch (deviceType) {
      case 'ios':
        return (
          <div className="space-y-4">
            {iOSInstructions}
            <p className="text-center text-xs text-[var(--color-text-muted)]">
              Using a different device? Swipe down to see other options.
            </p>
            <details className="group">
              <summary className="text-center text-sm text-[var(--color-primary)] cursor-pointer">
                Show Android instructions
              </summary>
              <div className="mt-4">{androidInstructions}</div>
            </details>
          </div>
        );
      case 'android':
        return (
          <div className="space-y-4">
            {androidInstructions}
            <p className="text-center text-xs text-[var(--color-text-muted)]">
              Using a different device? Tap below to see other options.
            </p>
            <details className="group">
              <summary className="text-center text-sm text-[var(--color-primary)] cursor-pointer">
                Show iOS instructions
              </summary>
              <div className="mt-4">{iOSInstructions}</div>
            </details>
          </div>
        );
      default:
        return (
          <div className="space-y-4">
            {desktopNotice}
            <div className="bg-[var(--color-surface-elevated)] rounded-xl p-6 text-center">
              <p className="text-sm text-[var(--color-text-muted)] mb-4">
                Scan this QR code with your phone:
              </p>
              <div className="flex justify-center mb-4">
                <div className="bg-white p-3 rounded-xl">
                  <QRCodeSVG
                    value={window.location.origin}
                    size={160}
                    level="M"
                    includeMargin={false}
                  />
                </div>
              </div>
              <p className="font-mono text-xs text-[var(--color-text-muted)] break-all">
                {window.location.origin}
              </p>
            </div>
            <details className="group">
              <summary className="text-center text-sm text-[var(--color-text-muted)] cursor-pointer">
                View mobile installation instructions
              </summary>
              <div className="mt-4 space-y-4">
                {iOSInstructions}
                {androidInstructions}
              </div>
            </details>
          </div>
        );
    }
  };

  const steps: OnboardingStep[] = [
    {
      icon: <Rocket className="w-16 h-16 text-[var(--color-primary)]" />,
      title: 'Welcome to CrossfitToolkit',
      description: 'Your personal PR tracker for CrossFit workouts, benchmarks, and lifts.',
      content: (
        <div className="space-y-4 text-center">
          <p className="text-[var(--color-text-muted)]">
            Track your progress, set new PRs, and never forget your best performances.
          </p>
          <div className="flex justify-center gap-4 pt-4">
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-amber-400/20 flex items-center justify-center">
                <span className="text-amber-400 font-bold">WOD</span>
              </div>
              <span className="text-xs text-[var(--color-text-muted)]">Benchmarks</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-blue-400/20 flex items-center justify-center">
                <span className="text-blue-400 font-bold">PR</span>
              </div>
              <span className="text-xs text-[var(--color-text-muted)]">Lifts</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-green-400/20 flex items-center justify-center">
                <span className="text-green-400 font-bold">CAL</span>
              </div>
              <span className="text-xs text-[var(--color-text-muted)]">Cardio</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      icon: <Smartphone className="w-16 h-16 text-[var(--color-primary)]" />,
      title: 'Install as an App',
      description: 'Add CrossfitToolkit to your home screen for the best experience.',
      content: getInstallContent(),
    },
    {
      icon: <Database className="w-16 h-16 text-[var(--color-primary)]" />,
      title: 'Your Data, Your Device',
      description: 'All your data stays on your device. No account needed.',
      content: (
        <div className="space-y-4">
          <div className="bg-[var(--color-surface-elevated)] rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-green-400/20 flex items-center justify-center flex-shrink-0">
                <Database className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h4 className="font-semibold text-[var(--color-text)] mb-1">100% Private</h4>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Your PRs and workout data are stored locally on this device only. We never see or collect your data.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-400/20 flex items-center justify-center flex-shrink-0">
                <span className="text-amber-400 text-lg">⚠️</span>
              </div>
              <div>
                <h4 className="font-semibold text-amber-400 mb-1">Important</h4>
                <p className="text-sm text-[var(--color-text-muted)]">
                  If you uninstall the app or clear browser data, <strong className="text-[var(--color-text)]">your data will be lost</strong>. Make sure to export a backup regularly!
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      icon: (
        <div className="flex gap-2">
          <Download className="w-12 h-12 text-[var(--color-primary)]" />
          <Upload className="w-12 h-12 text-[var(--color-primary)]" />
        </div>
      ),
      title: 'Backup & Restore',
      description: 'Export your data anytime and restore it on any device.',
      content: (
        <div className="space-y-4">
          <div className="bg-[var(--color-surface-elevated)] rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-400/20 flex items-center justify-center flex-shrink-0">
                <Download className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h4 className="font-semibold text-[var(--color-text)] mb-1">Export Data</h4>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Download all your PRs, favorites, and settings as a JSON file. Store it safely!
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[var(--color-surface-elevated)] rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-400/20 flex items-center justify-center flex-shrink-0">
                <Upload className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h4 className="font-semibold text-[var(--color-text)] mb-1">Import Data</h4>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Restore your data from a backup file. Transfer between devices easily.
                </p>
              </div>
            </div>
          </div>

          <p className="text-center text-sm text-[var(--color-text-muted)]">
            Find these options in <strong className="text-[var(--color-text)]">Settings → Data</strong>
          </p>
        </div>
      ),
    },
    {
      icon: <Rocket className="w-16 h-16 text-[var(--color-primary)]" />,
      title: "You're All Set!",
      description: 'Start tracking your CrossFit journey.',
      content: (
        <div className="space-y-6 text-center">
          <p className="text-[var(--color-text-muted)]">
            Search for workouts, log your PRs, and watch your progress grow over time.
          </p>
          <div className="bg-[var(--color-surface-elevated)] rounded-xl p-4">
            <p className="text-sm text-[var(--color-text-muted)]">
              <strong className="text-[var(--color-text)]">Pro tip:</strong> Star your favorite workouts for quick access from the home screen!
            </p>
          </div>
        </div>
      ),
    },
  ];

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
    if (isRightSwipe && currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = async () => {
    await updateSettings({ hasSeenOnboarding: true });
    navigate('/', { replace: true });
  };

  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      {/* Skip button */}
      <div className="flex justify-end p-4">
        <button
          onClick={handleSkip}
          className="flex items-center gap-1 px-3 py-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          aria-label="Skip onboarding"
        >
          <span>Skip</span>
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Swipeable content area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex transition-transform duration-300 ease-out h-full"
          style={{ transform: `translateX(-${currentStep * 100}%)` }}
        >
          {steps.map((step, index) => (
            <div
              key={index}
              className="w-full flex-shrink-0 px-6 flex flex-col"
            >
              {/* Icon */}
              <div className="flex justify-center mb-6">{step.icon}</div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-[var(--color-text)] text-center mb-2">
                {step.title}
              </h2>

              {/* Description */}
              <p className="text-[var(--color-text-muted)] text-center mb-6">
                {step.description}
              </p>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">{step.content}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="p-6 space-y-4">
        {/* Progress dots */}
        <div className="flex justify-center gap-2">
          {steps.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentStep
                  ? 'w-6 bg-[var(--color-primary)]'
                  : 'bg-[var(--color-border)] hover:bg-[var(--color-text-muted)]'
              }`}
              aria-label={`Go to step ${index + 1}`}
            />
          ))}
        </div>

        {/* Next / Get Started button */}
        <button
          onClick={handleNext}
          className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] rounded-xl text-white font-semibold transition-colors"
          aria-label={isLastStep ? 'Get started' : 'Next step'}
        >
          <span>{isLastStep ? 'Get Started' : 'Next'}</span>
          {!isLastStep && <ChevronRight className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
};
