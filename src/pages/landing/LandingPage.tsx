import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { platformService } from '../../services/platform.service';
import type { SubscriptionPlanRecord } from '../../services/platform.service';
import { ROUTES } from '../../config/constants';
import './LandingPage.css';

const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    
    const [timeLeft, setTimeLeft] = useState({
        days: '00',
        hours: '00',
        minutes: '00',
        seconds: '00'
    });
    
    const [toast, setToast] = useState<{ message: string, isError: boolean, show: boolean }>({ message: '', isError: false, show: false });
    const [isYearly, setIsYearly] = useState(false);

    const [email, setEmail] = useState('');
    const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', message: '' });

    const statNumbersRef = useRef<(HTMLDivElement | null)[]>([]);
    const featureCardsRef = useRef<(HTMLDivElement | null)[]>([]);
    const pricingCardsRef = useRef<(HTMLDivElement | null)[]>([]);
    const driverFeaturesRef = useRef<(HTMLLIElement | null)[]>([]);
    const statsSectionRef = useRef<HTMLElement>(null);
    const orbsRef = useRef<(HTMLDivElement | null)[]>([]);

    const [animatedStats, setAnimatedStats] = useState(false);
    const [plans, setPlans] = useState<SubscriptionPlanRecord[]>([]);
    const [isLoadingPlans, setIsLoadingPlans] = useState(true);

    useEffect(() => {
        platformService.getPlans().then((response: any) => {
            const plansData = response?.data || response;
            if (Array.isArray(plansData)) {
                setPlans(plansData.filter((p: any) => p.isActive !== false));
            }
            setIsLoadingPlans(false);
        }).catch(err => {
            console.error('Failed to fetch plans', err);
            setIsLoadingPlans(false);
        });
    }, []);

    useEffect(() => {
        const launchDate = new Date();
        launchDate.setDate(launchDate.getDate() + 3);
        launchDate.setHours(0, 0, 0, 0);

        const updateCountdown = () => {
            const now = new Date();
            const diff = launchDate.getTime() - now.getTime();
            
            if (diff <= 0) {
                setTimeLeft({ days: '00', hours: '00', minutes: '00', seconds: '00' });
                return;
            }
            
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            
            setTimeLeft({
                days: days.toString().padStart(2, '0'),
                hours: hours.toString().padStart(2, '0'),
                minutes: minutes.toString().padStart(2, '0'),
                seconds: seconds.toString().padStart(2, '0')
            });
        };

        const timer = setInterval(updateCountdown, 1000);
        updateCountdown();

        return () => clearInterval(timer);
    }, []);

    const showToast = (message: string, isError = false) => {
        setToast({ message, isError, show: true });
        setTimeout(() => {
            setToast(prev => ({ ...prev, show: false }));
        }, 3000);
    };

    const handleSignupSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            let subscribers = JSON.parse(localStorage.getItem('fleettrack_subscribers') || '[]');
            if (!subscribers.includes(email)) {
                subscribers.push(email);
                localStorage.setItem('fleettrack_subscribers', JSON.stringify(subscribers));
                showToast("Thanks! We'll notify you when we launch 🚀");
            } else {
                showToast("You're already subscribed!");
            }
            setEmail('');
        } else {
            showToast('Please enter a valid email address', true);
        }
    };

    const handleContactSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const { name, email: contactEmail } = contactForm;
        if (name.trim() && contactEmail.trim()) {
            showToast('Message sent successfully! We\'ll get back to you soon.');
            setContactForm({ name: '', email: '', phone: '', message: '' });
        } else {
            showToast('Please fill all required fields', true);
        }
    };

    const trackButtonClick = (buttonName: string) => {
        let clicks = JSON.parse(localStorage.getItem('fleettrack_button_clicks') || '{}');
        clicks[buttonName] = (clicks[buttonName] || 0) + 1;
        localStorage.setItem('fleettrack_button_clicks', JSON.stringify(clicks));
    };

    const handleApkDownload = () => {
        trackButtonClick('APK_Download');
        showToast('Downloading FleetTrack Driver App... 🚀');
    };

    const scrollToTarget = (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>, targetId: string) => {
        e.preventDefault();
        const target = document.querySelector(targetId);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setIsMobileMenuOpen(false);
        }
    };

    useEffect(() => {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    (entry.target as HTMLElement).style.opacity = '1';
                    (entry.target as HTMLElement).style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);

        const elements = [...featureCardsRef.current, ...pricingCardsRef.current];
        elements.forEach(el => {
            if (el) {
                el.style.opacity = '0';
                el.style.transform = 'translateY(30px)';
                el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                observer.observe(el);
            }
        });

        const driverObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    (entry.target as HTMLElement).style.opacity = '1';
                    (entry.target as HTMLElement).style.transform = 'translateX(0)';
                }
            });
        }, { threshold: 0.1 });

        driverFeaturesRef.current.forEach((el, index) => {
            if (el) {
                el.style.opacity = '0';
                el.style.transform = 'translateX(-20px)';
                el.style.transition = `opacity 0.5s ease ${index * 0.1}s, transform 0.5s ease ${index * 0.1}s`;
                driverObserver.observe(el);
            }
        });

        return () => {
            observer.disconnect();
            driverObserver.disconnect();
        };
    }, []);

    useEffect(() => {
        const animateNumbers = () => {
            if (animatedStats) return;
            
            statNumbersRef.current.forEach(stat => {
                if (!stat) return;
                const target = parseInt(stat.getAttribute('data-target') || '0');
                if (isNaN(target)) return;
                
                let current = 0;
                const increment = target / 50;
                const updateNumber = () => {
                    current += increment;
                    if (current < target) {
                        stat.textContent = Math.floor(current).toString();
                        requestAnimationFrame(updateNumber);
                    } else {
                        stat.textContent = target.toString();
                    }
                };
                updateNumber();
            });
            setAnimatedStats(true);
        };

        const statsObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !animatedStats) {
                    animateNumbers();
                }
            });
        }, { threshold: 0.5 });

        if (statsSectionRef.current) {
            statsObserver.observe(statsSectionRef.current);
        }

        return () => statsObserver.disconnect();
    }, [animatedStats]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const x = e.clientX / window.innerWidth;
            const y = e.clientY / window.innerHeight;
            
            orbsRef.current.forEach((orb, index) => {
                if (!orb) return;
                const speed = (index + 1) * 15;
                const moveX = (x - 0.5) * speed;
                const moveY = (y - 0.5) * speed;
                orb.style.transform = `translate(${moveX}px, ${moveY}px)`;
            });
        };

        document.addEventListener('mousemove', handleMouseMove);
        return () => document.removeEventListener('mousemove', handleMouseMove);
    }, []);

    const currentYear = new Date().getFullYear();

    return (
        <div className="landing-page-container">
            <div className="gradient-bg">
                <div className="gradient-orb orb-1" ref={el => {orbsRef.current[0] = el;}}></div>
                <div className="gradient-orb orb-2" ref={el => {orbsRef.current[1] = el;}}></div>
                <div className="gradient-orb orb-3" ref={el => {orbsRef.current[2] = el;}}></div>
                <div className="gradient-orb orb-4" ref={el => {orbsRef.current[3] = el;}}></div>
            </div>

            <nav className="navbar">
                <div className="nav-container">
                    <div className="logo">
                        <div className="logo-icon">
                            <i className="fas fa-truck-fast"></i>
                        </div>
                        <div className="logo-text">
                            <div className="logo-main">Fleet<span className="logo-highlight">Track</span></div>
                            <div className="logo-sub">Expense Management System</div>
                        </div>
                    </div>
                    <div className="nav-links">
                        <a href="#features" onClick={(e) => scrollToTarget(e, '#features')}>Features</a>
                        <a href="#pricing" onClick={(e) => scrollToTarget(e, '#pricing')}>Pricing</a>
                        <a href="#contact" onClick={(e) => scrollToTarget(e, '#contact')}>Contact</a>
                        <a href={ROUTES.SIGN_IN} className="nav-login" onClick={(e) => { e.preventDefault(); navigate(ROUTES.SIGN_IN); }}>Login</a>
                        <a href="#pricing" className="nav-cta" onClick={(e) => { trackButtonClick('Get Started Nav'); scrollToTarget(e, '#pricing'); }}>Get Started</a>
                    </div>
                    <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                        <i className={`fas ${isMobileMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
                    </button>
                </div>
            </nav>

            <div className="mobile-menu" style={{ display: isMobileMenuOpen ? 'flex' : 'none' }}>
                <a href="#features" onClick={(e) => scrollToTarget(e, '#features')}>Features</a>
                <a href="#pricing" onClick={(e) => scrollToTarget(e, '#pricing')}>Pricing</a>
                <a href="#driver-app" onClick={(e) => scrollToTarget(e, '#driver-app')}>Driver App</a>
                <a href="#contact" onClick={(e) => scrollToTarget(e, '#contact')}>Contact</a>
                <a href={ROUTES.SIGN_IN} onClick={(e) => { e.preventDefault(); navigate(ROUTES.SIGN_IN); }}>Login</a>
                <a href="#driver-app" className="mobile-cta" onClick={(e) => { trackButtonClick('Mobile CTA'); scrollToTarget(e, '#driver-app'); }}>Download Driver App</a>
            </div>

            <section className="hero">
                <div className="hero-content">
                    <div className="badge">
                        <span className="badge-pulse"></span>
                        <i className="fas fa-rocket"></i>
                        <span>Launching Soon</span>
                    </div>
                    <h1 className="hero-title">
                        Smart Fleet Management
                        <span className="gradient-text">For Modern Businesses</span>
                    </h1>
                    <p className="hero-description">
                        Track expenses, manage drivers, and scale your fleet business effortlessly 
                        with our powerful multi-tenant SaaS platform.
                    </p>
                    
                    <div className="countdown">
                        <div className="countdown-item">
                            <div className="countdown-number">{timeLeft.days}</div>
                            <div className="countdown-label">Days</div>
                        </div>
                        <div className="countdown-separator">:</div>
                        <div className="countdown-item">
                            <div className="countdown-number">{timeLeft.hours}</div>
                            <div className="countdown-label">Hours</div>
                        </div>
                        <div className="countdown-separator">:</div>
                        <div className="countdown-item">
                            <div className="countdown-number">{timeLeft.minutes}</div>
                            <div className="countdown-label">Minutes</div>
                        </div>
                        <div className="countdown-separator">:</div>
                        <div className="countdown-item">
                            <div className="countdown-number">{timeLeft.seconds}</div>
                            <div className="countdown-label">Seconds</div>
                        </div>
                    </div>

                    <form className="signup-form" onSubmit={handleSignupSubmit}>
                        <div className="input-group">
                            <i className="fas fa-envelope"></i>
                            <input 
                                type="email" 
                                placeholder="Enter your email for early access" 
                                required 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <button type="submit" className="btn-primary" onClick={() => trackButtonClick('Notify Me')}>
                            Notify Me <i className="fas fa-arrow-right"></i>
                        </button>
                    </form>
                    <p className="form-note">
                        <i className="fas fa-shield-alt"></i> No spam, only launch updates
                    </p>
                </div>
                
                <div className="hero-visual">
                    <div className="stats-card">
                        <div className="stats-header">
                            <div className="stats-title">
                                <i className="fas fa-chart-simple"></i>
                                <span>Live Analytics</span>
                            </div>
                            <div className="stats-dots">
                                <span></span><span></span><span></span>
                            </div>
                        </div>
                        <div className="stats-numbers">
                            <div className="stat-item">
                                <div className="stat-value">156</div>
                                <div className="stat-label">Active Vehicles</div>
                            </div>
                            <div className="stat-item">
                                <div className="stat-value">₹2.4L</div>
                                <div className="stat-label">Monthly Savings</div>
                            </div>
                        </div>
                        <div className="stats-chart">
                            <div className="chart-bar" style={{height: '60%'}}></div>
                            <div className="chart-bar" style={{height: '85%'}}></div>
                            <div className="chart-bar" style={{height: '45%'}}></div>
                            <div className="chart-bar" style={{height: '70%'}}></div>
                            <div className="chart-bar" style={{height: '90%'}}></div>
                            <div className="chart-bar" style={{height: '55%'}}></div>
                        </div>
                        <div className="stats-footer">
                            <span><i className="fas fa-trending-up"></i> +32% efficiency</span>
                            <span><i className="fas fa-clock"></i> Real-time</span>
                        </div>
                    </div>
                </div>
            </section>

            <section className="features" id="features">
                <div className="container">
                    <div className="section-header">
                        <div className="section-badge">Why Choose FleetTrack</div>
                        <h2>Everything you need to manage your fleet</h2>
                        <p>Powerful features designed for fleet owners, admins, and drivers</p>
                    </div>
                    
                    <div className="features-grid">
                        <div className="feature-card" ref={el => {featureCardsRef.current[0] = el;}}>
                            <div className="feature-icon">
                                <i className="fas fa-key"></i>
                            </div>
                            <h3>License Key System</h3>
                            <p>Generate and manage license keys for client companies. Perfect SaaS business model ready.</p>
                            <div className="feature-tag">SaaS Ready</div>
                        </div>
                        
                        <div className="feature-card" ref={el => {featureCardsRef.current[1] = el;}}>
                            <div className="feature-icon">
                                <i className="fas fa-chart-line"></i>
                            </div>
                            <h3>7 Expense Categories</h3>
                            <p>Fuel, Maintenance, Insurance, EMI, Salary, Toll, and Miscellaneous – track every rupee.</p>
                            <div className="feature-tag">Smart Tracking</div>
                        </div>
                        
                        <div className="feature-card" ref={el => {featureCardsRef.current[2] = el;}}>
                            <div className="feature-icon">
                                <i className="fas fa-building"></i>
                            </div>
                            <h3>Multi-Tenant Architecture</h3>
                            <p>Fully isolated environments for each client company. Secure and scalable.</p>
                            <div className="feature-tag">Enterprise Grade</div>
                        </div>
                        
                        <div className="feature-card" ref={el => {featureCardsRef.current[3] = el;}}>
                            <div className="feature-icon">
                                <i className="fas fa-file-export"></i>
                            </div>
                            <h3>Reports & Export</h3>
                            <p>Generate detailed reports and export data for accounting and analysis.</p>
                            <div className="feature-tag">Analytics</div>
                        </div>
                    </div>
                    
                    <div className="feature-highlight">
                        <div className="highlight-item">
                            <i className="fas fa-shield-alt"></i>
                            <span>Enterprise Grade Security</span>
                        </div>
                        <div className="highlight-divider"></div>
                        <div className="highlight-item">
                            <i className="fas fa-cloud-upload-alt"></i>
                            <span>Real-time Cloud Sync</span>
                        </div>
                        <div className="highlight-divider"></div>
                        <div className="highlight-item">
                            <i className="fas fa-headset"></i>
                            <span>24/7 Dedicated Support</span>
                        </div>
                        <div className="highlight-divider"></div>
                        <div className="highlight-item">
                            <i className="fas fa-expand-arrows-alt"></i>
                            <span>Scalable Infrastructure</span>
                        </div>
                    </div>
                </div>
            </section>

            <section className="stats-section" ref={statsSectionRef}>
                <div className="container">
                    <div className="stats-grid">
                        <div className="stat-block">
                            <div className="stat-number" data-target="500" ref={el => {statNumbersRef.current[0] = el;}}>0</div>
                            <div className="stat-text">Happy Clients</div>
                        </div>
                        <div className="stat-block">
                            <div className="stat-number" data-target="5000" ref={el => {statNumbersRef.current[1] = el;}}>0</div>
                            <div className="stat-text">Vehicles Managed</div>
                        </div>
                        <div className="stat-block">
                            <div className="stat-number" data-target="50" ref={el => {statNumbersRef.current[2] = el;}}>0</div>
                            <div className="stat-text">Cities Covered</div>
                        </div>
                        <div className="stat-block">
                            <div className="stat-number" data-target="24" ref={el => {statNumbersRef.current[3] = el;}}>0</div>
                            <div className="stat-text">Support Hours</div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="pricing" id="pricing">
                <div className="container">
                    <div className="section-header">
                        <div className="section-badge">Simple Pricing</div>
                        <h2>Choose the perfect plan for your business</h2>
                        <p>Flexible subscription plans for fleet companies of all sizes</p>
                        
                        <div className="billing-toggle">
                            <span className={`billing-label ${!isYearly ? 'active' : ''}`}>Monthly</span>
                            <label className="toggle-switch">
                                <input type="checkbox" checked={isYearly} onChange={(e) => setIsYearly(e.target.checked)} />
                                <span className="toggle-slider"></span>
                            </label>
                            <span className={`billing-label ${isYearly ? 'active' : ''}`}>Yearly <span className="save-badge">Save 15%</span></span>
                        </div>
                    </div>
                    
                    <div className="pricing-grid">
                        {isLoadingPlans ? (
                            <div style={{ textAlign: 'center', width: '100%', padding: '3rem', color: 'var(--gray)', gridColumn: '1 / -1' }}>
                                <i className="fas fa-circle-notch fa-spin" style={{ fontSize: '2.5rem', color: 'var(--primary)', marginBottom: '1rem' }}></i>
                                <p>Loading pricing plans...</p>
                            </div>
                        ) : plans.length === 0 ? (
                            <div style={{ textAlign: 'center', width: '100%', padding: '3rem', color: 'var(--gray)', gridColumn: '1 / -1' }}>
                                <i className="fas fa-box-open" style={{ fontSize: '2.5rem', color: 'var(--gray-light)', marginBottom: '1rem' }}></i>
                                <p>No pricing plans available at the moment.</p>
                            </div>
                        ) : (
                            plans.map((plan, index) => {
                                const isFeatured = plan.planType.toUpperCase() === 'STANDARD' || plan.planType.toUpperCase() === 'PRO';
                                const isFree = plan.monthlyPriceInr === 0 && plan.yearlyPriceInr === 0;
                                const isPremium = plan.planType.toUpperCase() === 'PREMIUM' || plan.planType.toUpperCase() === 'ENTERPRISE';

                                return (
                                    <div className={`pricing-card ${isFeatured ? 'featured' : ''}`} key={plan._id || plan.planType} ref={el => {pricingCardsRef.current[index] = el;}}>
                                        {isFeatured && <div className="popular-badge">Most Popular</div>}
                                        <div className="pricing-header">
                                            <div className="pricing-icon">
                                                <i className={isFree ? 'fas fa-truck' : isPremium ? 'fas fa-building' : isFeatured ? 'fas fa-chart-line' : 'fas fa-truck-moving'}></i>
                                            </div>
                                            <h3>{plan.displayName || plan.planType}</h3>
                                            <div className="price">
                                                <span className="currency">₹</span>
                                                <span className="price-amount">{isYearly ? plan.yearlyPriceInr : plan.monthlyPriceInr}</span>
                                                <span className="period">/{isYearly ? 'year' : 'month'}</span>
                                            </div>
                                            <p className="price-sub">{plan.description || (isFree ? 'Perfect for small fleets' : isPremium ? 'For large enterprises' : 'Best for growing businesses')}</p>
                                        </div>
                                        <ul className="pricing-features">
                                            <li><i className="fas fa-check"></i> <span>{plan.vehicleLimit} vehicles limit</span></li>
                                            {plan.maxAdmins !== undefined && <li><i className="fas fa-check"></i> <span>Up to {plan.maxAdmins} sub-admin</span></li>}
                                            {plan.supportType && <li><i className="fas fa-check"></i> <span>{plan.supportType} Support</span></li>}
                                            {plan.features?.map((feature, i) => (
                                                <li key={i}><i className="fas fa-check"></i> <span>{feature}</span></li>
                                            ))}
                                        </ul>
                                        <div className="pricing-footer">
                                            <button className={isFeatured ? 'btn-primary' : 'btn-outline'} onClick={() => {
                                                trackButtonClick(`${plan.planType} Plan`);
                                                navigate(`/onboarding?planId=${plan._id}&billingPeriod=${isYearly ? 'YEARLY' : 'MONTHLY'}`);
                                            }}>
                                                {isFree ? 'Get Started' : 'Subscribe Now'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </section>

            <section className="driver-app" id="driver-app">
                <div className="container">
                    <div className="section-header">
                        <div className="section-badge"><i className="fas fa-mobile-alt"></i> Driver App</div>
                        <h2>FleetTrack Driver App</h2>
                        <p>Designed specifically for drivers to manage trips, expenses, and stay connected with the fleet</p>
                    </div>
                    
                    <div className="driver-wrapper">
                        <div className="driver-info">
                            <div className="driver-badge">
                                <i className="fas fa-user-check"></i>
                                <span>For Drivers Only</span>
                            </div>
                            <h3>Everything a driver needs, in one app</h3>
                            <ul className="driver-features">
                                <li ref={el => {driverFeaturesRef.current[0] = el;}}>
                                    <i className="fas fa-route"></i>
                                    <div>
                                        <strong>Trip Management</strong>
                                        <span>View assigned trips, routes, and delivery schedules</span>
                                    </div>
                                </li>
                                <li ref={el => {driverFeaturesRef.current[1] = el;}}>
                                    <i className="fas fa-receipt"></i>
                                    <div>
                                        <strong>Expense Logging</strong>
                                        <span>Log fuel, toll, maintenance, and other expenses on-the-go</span>
                                    </div>
                                </li>
                                
                                <li ref={el => {driverFeaturesRef.current[2] = el;}}>
                                    <i className="fas fa-bell"></i>
                                    <div>
                                        <strong>Instant Notifications</strong>
                                        <span>Get alerts for new trips, approvals, and important updates</span>
                                    </div>
                                </li>
                                <li ref={el => {driverFeaturesRef.current[3] = el;}}>
                                    <i className="fas fa-wallet"></i>
                                    <div>
                                        <strong>Expense Reports</strong>
                                        <span>View your daily, weekly, and monthly expense summaries</span>
                                    </div>
                                </li>
                            </ul>
                        </div>

                        <div className="driver-download">
                            <div className="download-card">
                                <div className="download-icon">
                                    <i className="fas fa-user"></i>
                                </div>
                                <h3>Driver App</h3>
                                <p className="download-desc">Version 1.0.0 · 67 MB</p>
                                
                                <div className="download-requirements">
                                    <span><i className="fab fa-android"></i> Android 6.0+</span>
                                    <span><i className="fas fa-memory"></i> 1GB RAM</span>
                                    <span><i className="fas fa-database"></i> 100MB Storage</span>
                                </div>
                                
                                <a href="https://fleettrack-driver-apk.s3.ap-south-1.amazonaws.com/Fleet-Driver-app.apk" download className="btn-download" onClick={handleApkDownload} style={{width: '100%', display: 'inline-block', textAlign: 'center', textDecoration: 'none'}}>
                                    <i className="fas fa-download"></i> Download Driver APK
                                </a>
                                <p className="download-note">
                                    <i className="fas fa-shield-alt"></i> Secure · Verified · Direct Download
                                </p>
                                <div className="driver-cta-note">
                                    <i className="fas fa-info-circle"></i> 
                                    <span>This app is only for drivers. Fleet owners use the web dashboard.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="contact" id="contact">
                <div className="container">
                    <div className="contact-wrapper">
                        <div className="contact-info">
                            <div className="section-badge">Get In Touch</div>
                            <h2>Ready to revolutionize your fleet management?</h2>
                            <p>Be among the first to know when we launch. Get exclusive early access and special pricing.</p>
                            <div className="contact-details">
                                <div className="contact-item">
                                    <div className="contact-icon"><i className="fas fa-envelope"></i></div>
                                    <div>
                                        <h4>Email Us</h4>
                                        <span>fleettrackservice@gmail.com</span>
                                    </div>
                                </div>
                                <div className="contact-item">
                                    <div className="contact-icon"><i className="fas fa-phone-alt"></i></div>
                                    <div>
                                        <h4>Call Us</h4>
                                        <span>+91 8339889158</span>
                                    </div>
                                </div>
                                <div className="contact-item">
                                    <div className="contact-icon"><i className="fas fa-map-marker-alt"></i></div>
                                    <div>
                                        <h4>Visit Us</h4>
                                        <span>Bhubaneswar, Odisha, India - 751015</span>
                                    </div>
                                </div>
                            </div>
                            <div className="social-links">
                                <a href="#"><i className="fab fa-twitter"></i></a>
                                <a href="#"><i className="fab fa-linkedin-in"></i></a>
                                <a href="#"><i className="fab fa-facebook-f"></i></a>
                                <a href="#"><i className="fab fa-instagram"></i></a>
                            </div>
                        </div>
                        <form className="contact-form" onSubmit={handleContactSubmit}>
                            <div className="form-group">
                                <input type="text" placeholder="Your Name" required value={contactForm.name} onChange={(e) => setContactForm({...contactForm, name: e.target.value})} />
                                <i className="fas fa-user"></i>
                            </div>
                            <div className="form-group">
                                <input type="email" placeholder="Your Email" required value={contactForm.email} onChange={(e) => setContactForm({...contactForm, email: e.target.value})} />
                                <i className="fas fa-envelope"></i>
                            </div>
                            <div className="form-group">
                                <input type="tel" placeholder="Your Phone Number" value={contactForm.phone} onChange={(e) => setContactForm({...contactForm, phone: e.target.value})} />
                                <i className="fas fa-phone"></i>
                            </div>
                            <div className="form-group">
                                <textarea rows={4} placeholder="Your Message" value={contactForm.message} onChange={(e) => setContactForm({...contactForm, message: e.target.value})}></textarea>
                                <i className="fas fa-comment"></i>
                            </div>
                            <button type="submit" className="btn-primary" onClick={() => trackButtonClick('Send Message')}>Send Message <i className="fas fa-paper-plane"></i></button>
                        </form>
                    </div>
                </div>
            </section>

            <footer className="footer">
                <div className="container">
                    <div className="footer-content">
                        <div className="footer-brand">
                            <div className="footer-logo">
                                <i className="fas fa-truck-fast"></i>
                                <div>
                                    <div className="logo-main">Fleet<span>Track</span></div>
                                    <div className="logo-sub">Expense Management System</div>
                                </div>
                            </div>
                            <p>Multi-Tenant Fleet Expense Management System for modern businesses.</p>
                            <div style={{marginTop: '0.8rem'}}>
                                <a href="https://fleettrack-driver-apk.s3.ap-south-1.amazonaws.com/Fleet-Driver-app.apk" download onClick={handleApkDownload} style={{color: 'var(--primary)', textDecoration: 'none', fontWeight: '600', cursor: 'pointer', fontSize: '1rem'}}>
                                    <i className="fas fa-download"></i> Download Driver App
                                </a>
                            </div>
                        </div>
                        <div className="footer-links">
                            <h4>Product</h4>
                            <a href="#features" onClick={(e) => scrollToTarget(e, '#features')}>Features</a>
                            <a href="#pricing" onClick={(e) => scrollToTarget(e, '#pricing')}>Pricing</a>
                            <a href="#driver-app" onClick={(e) => scrollToTarget(e, '#driver-app')}>Driver App</a>
                        </div>
                        <div className="footer-links">
                            <h4>Company</h4>
                            <a href="#">About Us</a>
                            <a href="#contact" onClick={(e) => scrollToTarget(e, '#contact')}>Contact</a>
                            <a href="#">Careers</a>
                        </div>
                        <div className="footer-links">
                            <h4>Legal</h4>
                            <a href="#">Privacy Policy</a>
                            <a href="#">Terms of Service</a>
                            <a href="#">Refund Policy</a>
                        </div>
                    </div>
                    <div className="footer-bottom">
                        <p>&copy; {currentYear} FleetTrack. All rights reserved. | Bhubaneswar, Odisha, India</p>
                    </div>
                </div>
            </footer>

            <div className={`toast ${toast.show ? 'show' : ''}`} style={toast.isError ? {background: '#ef4444'} : {background: '#10b981'}}>
                <i className={toast.isError ? 'fas fa-exclamation-circle' : 'fas fa-check-circle'}></i>
                <span id="toastMessage">{toast.message}</span>
            </div>
        </div>
    );
};

export default LandingPage;
