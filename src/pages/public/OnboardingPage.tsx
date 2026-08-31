import React, { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { onboardingService } from "../../services/onboarding.service";
import { platformService } from "../../services/platform.service";
import type { SubscriptionPlanRecord } from "../../services/platform.service";
import { ROUTES } from "../../config/constants";
import { AuthPageBrand } from "../../components/auth/AuthPageBrand";
import { AuthPageFooter } from "../../components/auth/AuthPageFooter";
import {
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  Truck,
  User,
} from "lucide-react";
import "./OnboardingPage.css";

const loadRazorpayScript = () =>
  new Promise<boolean>((resolve) => {
    if ((window as unknown as { Razorpay?: unknown }).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const OnboardingPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const planId = searchParams.get("planId");
  const billingPeriod =
    (searchParams.get("billingPeriod") as "MONTHLY" | "YEARLY") || "MONTHLY";

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] =
    useState<SubscriptionPlanRecord | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedLegal, setAcceptedLegal] = useState(false);

  const [formData, setFormData] = useState({
    companyName: "",
    adminName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response: any = await platformService.getPlans();
        const plansData = response?.data || response;
        if (Array.isArray(plansData)) {
          if (planId) {
            const plan = plansData.find((p) => p._id === planId);
            if (plan) setSelectedPlan(plan);
          }
        }
      } catch (error) {
        console.error("Failed to fetch plans", error);
        toast.error("Failed to load plan details.");
      }
    };
    fetchPlans();
  }, [planId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (!acceptedLegal) {
      toast.error("Please accept the Terms of Service and Privacy Policy");
      return;
    }
    if (!selectedPlan) {
      toast.error("Please select a plan first");
      return;
    }
    setStep(2);
  };

  const handleCreateOrder = async () => {
    if (!selectedPlan) return;
    setIsLoading(true);
    try {
      const response = await onboardingService.createOrder({
        planId: selectedPlan._id!,
        billingPeriod: billingPeriod,
        companyName: formData.companyName,
        adminName: formData.adminName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
      });

      if (response.data?.isFree) {
        toast.success("Registration successful!");
        setStep(3); // Success step
        return;
      }

      openRazorpay(response.data);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to create payment order",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const openRazorpay = async (order: any) => {
    const isLoaded = await loadRazorpayScript();
    if (!isLoaded) {
      toast.error("Razorpay SDK failed to load. Are you offline?");
      return;
    }

    const options = {
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: "FleetTrack",
      description: `Subscription - ${selectedPlan?.displayName}`,
      order_id: order.orderId,
      handler: async function (response: any) {
        verifyPayment(response, order.pendingCompanyId);
      },
      prefill: {
        name: formData.adminName,
        email: formData.email,
        contact: formData.phone,
      },
      theme: {
        color: "#1890ff",
      },
    };

    const rzp = new (
      window as unknown as {
        Razorpay: new (options: Record<string, unknown>) => {
          on: (event: string, callback: (response: any) => void) => void;
          open: () => void;
        };
      }
    ).Razorpay(options);
    rzp.on("payment.failed", function (response: any) {
      toast.error(response.error.description || "Payment failed");
    });
    rzp.open();
  };

  const verifyPayment = async (paymentData: any, pendingCompanyId: string) => {
    setIsLoading(true);
    try {
      await onboardingService.verifyPayment({
        razorpay_order_id: paymentData.razorpay_order_id,
        razorpay_payment_id: paymentData.razorpay_payment_id,
        razorpay_signature: paymentData.razorpay_signature,
        pendingCompanyId,
      });
      toast.success("Payment successful! Account activated.");
      setStep(3);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          "Payment verification failed. Please contact support.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep1 = () => (
    <form onSubmit={handleNext} className="onboarding-form register-form">
      <AuthPageBrand />
      <h2>Register Your Company</h2>
      <p>Get started with your dedicated logistics dashboard.</p>

      {selectedPlan && (
        <div className="selected-plan-banner">
          <span className="plan-label">Selected Plan</span>
          <div className="plan-info-wrapper">
            <strong className="plan-name">
              {selectedPlan.displayName || selectedPlan.planType} — ₹
              {billingPeriod === "YEARLY"
                ? selectedPlan.yearlyPriceInr
                : selectedPlan.monthlyPriceInr}
              /{billingPeriod === "YEARLY" ? "year" : "month"}
            </strong>
            <a
              href="/#pricing"
              className="change-plan-link"
              onClick={(e) => {
                e.preventDefault();
                navigate("/#pricing");
                window.location.href = "/#pricing";
              }}
            >
              Change
            </a>
          </div>
        </div>
      )}

      <div className="form-group">
        <label>
          Company Name <span className="required">*</span>
        </label>
        <div className="input-with-icon">
          <Building2 />
          <input
            required
            type="text"
            name="companyName"
            value={formData.companyName}
            onChange={handleInputChange}
            placeholder="Enter your company name"
            minLength={3}
          />
        </div>
      </div>

      <div className="form-group">
        <label>
          Admin Full Name <span className="required">*</span>
        </label>
        <div className="input-with-icon">
          <User />
          <input
            required
            type="text"
            name="adminName"
            value={formData.adminName}
            onChange={handleInputChange}
            placeholder="Enter your Name "
            minLength={2}
          />
        </div>
      </div>

      <div className="form-group">
        <div className="form-group">
          <label>
            Email Address <span className="required">*</span>
          </label>
          <div className="input-with-icon">
            <Mail />
            <input
              required
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Enter your Email"
            />
          </div>
        </div>
        <div className="form-group">
          <label>
            Phone Number <span className="required">*</span>
          </label>
          <div className="input-with-icon">
            <Phone />
            <input
              required
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                })
              }
              placeholder="9876543210"
              inputMode="numeric"
              maxLength={10}
              pattern="[0-9]{10}"
              title="Phone number must be exactly 10 digits"
            />
          </div>
        </div>
      </div>

      <div className="form-group">
        <div className="form-group">
          <label>
            Password <span className="required">*</span>
          </label>
          <div className="input-with-icon password-input">
            <Lock />
            <input
              required
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Min 8 characters"
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </button>
          </div>
        </div>
        <div className="form-group">
          <label>
            Confirm Password <span className="required">*</span>
          </label>
          <div className="input-with-icon password-input">
            <Lock />
            <input
              required
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              placeholder="Re-enter password"
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={
                showConfirmPassword ? "Hide password" : "Show password"
              }
            >
              {showConfirmPassword ? <EyeOff /> : <Eye />}
            </button>
          </div>
        </div>
      </div>

      <label className="legal-consent">
        <input
          type="checkbox"
          checked={acceptedLegal}
          onChange={(e) => setAcceptedLegal(e.target.checked)}
        />
        <span>
          I agree to the{" "}
          <Link
            to={ROUTES.TERMS_OF_SERVICE}
            target="_blank"
            rel="noopener noreferrer"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            to={ROUTES.PRIVACY_POLICY}
            target="_blank"
            rel="noopener noreferrer"
          >
            Privacy Policy
          </Link>
          .
        </span>
      </label>

      <button type="submit" className="btn-primary full-width">
        Continue to Payment <ArrowRight />
      </button>
      <p className="login-prompt">
        Already registered?{" "}
        <Link
          to={`${ROUTES.SIGN_IN}?returnTo=${encodeURIComponent(
            `${ROUTES.REGISTER_COMPANY}?planId=${planId}&billingPeriod=${billingPeriod}`,
          )}`}
        >
          Login
        </Link>
      </p>
    </form>
  );

  const renderStep2 = () => {
    if (!selectedPlan) return null;

    const price =
      billingPeriod === "YEARLY"
        ? selectedPlan.yearlyPriceInr
        : selectedPlan.monthlyPriceInr;

    return (
      <div className="onboarding-summary">
        <div className="summary-header-icon">
          <i className="fas fa-file-invoice-dollar"></i>
        </div>
        <h2>Order Summary</h2>
        <p>Review your details before securely proceeding to payment.</p>

        <div className="summary-card">
          <div className="summary-card-header">
            <div className="plan-badge">{selectedPlan.displayName} Plan</div>
            <div className="plan-period">
              {billingPeriod === "YEARLY"
                ? "Yearly Billing"
                : "Monthly Billing"}
            </div>
          </div>
          <div className="plan-features-list">
            <div className="feature-item">
              <i className="fas fa-truck text-primary"></i>
              <span>Up to {selectedPlan.vehicleLimit} Vehicles</span>
            </div>
            <div className="feature-item">
              <i className="fas fa-user-tie text-primary"></i>
              <span>Up to {selectedPlan.maxAdmins} Admins</span>
            </div>
            <div className="feature-item">
              <i className="fas fa-id-card text-primary"></i>
              <span>Up to {selectedPlan.maxDrivers} Drivers</span>
            </div>
          </div>
          <div className="summary-body">
            <div className="summary-item">
              <span>Company Name</span>
              <strong>{formData.companyName}</strong>
            </div>
            <div className="summary-item">
              <span>Admin Name</span>
              <strong>{formData.adminName}</strong>
            </div>
            <div className="summary-item">
              <span>Contact</span>
              <strong>{formData.email}</strong>
            </div>
            <hr />
            <div className="summary-item">
              <span>Subtotal</span>
              <span>₹{price}</span>
            </div>
            <div className="summary-item total">
              <span>Total Due</span>
              <span>₹{price}</span>
            </div>
          </div>
        </div>

        <div className="secure-badge">
          <i className="fas fa-lock"></i> Secured by Razorpay
        </div>

        <div className="action-buttons">
          <button
            type="button"
            className="btn-outline"
            onClick={() => setStep(1)}
            disabled={isLoading}
          >
            <i className="fas fa-arrow-left"></i> Edit Details
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleCreateOrder}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> Processing...
              </>
            ) : (
              `Pay ₹${price} Now`
            )}
          </button>
        </div>
      </div>
    );
  };

  const renderStep3 = () => (
    <div className="onboarding-success">
      <div className="success-icon">
        <i className="fas fa-check-circle"></i>
      </div>
      <h2>Registration Successful!</h2>
      <p>
        Your company has been registered and activated. We've sent a welcome
        email with your license details.
      </p>
      <button className="btn-primary" onClick={() => navigate(ROUTES.SIGN_IN)}>
        Go to Login
      </button>
    </div>
  );

  return (
    <div className="register-page-shell">
      <aside className="register-hero">
        <div className="fleet-illustration" aria-hidden>
          <div className="illustration-building">
            <div className="building-windows">
              {Array.from({ length: 9 }).map((_, index) => (
                <span key={index} />
              ))}
            </div>
            <div className="building-door" />
          </div>
          <div className="illustration-truck truck-left">
            <Truck />
          </div>
          <div className="illustration-truck truck-right">
            <Truck />
          </div>
        </div>
        <h1>Scale Your Operations with Ease.</h1>
        <p>
          Join thousands of fleet operators managing real-time logistics with
          FleetTrack precision.
        </p>
      </aside>
      <main className="register-content">
        <div className="register-content-inner">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </div>
        <AuthPageFooter />
      </main>
    </div>
  );
};

export default OnboardingPage;
