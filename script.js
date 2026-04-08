document.addEventListener('DOMContentLoaded', () => {

    // --- Preloader ---
    const fastLoad = () => {
        document.body.classList.remove('loading');
        document.body.classList.add('loaded');
        setTimeout(() => {
            const preloader = document.getElementById('preloader');
            if (preloader) preloader.remove();
        }, 1000);
    };
    window.addEventListener('load', fastLoad);
    setTimeout(fastLoad, 5000); // Prolongado para 5s de imersão constante


    // --- Parallax ---
    const parallaxEls = document.querySelectorAll('[data-speed]');
    if (parallaxEls.length) {
        // Scroll Parallax
        window.addEventListener('scroll', () => {
            const sy = window.scrollY;
            parallaxEls.forEach(el => {
                const speed = +el.getAttribute('data-speed') || 0.1;
                el.style.transform = `translateY(${sy * speed}px)`;
            });
        });

        // Mouse Parallax (Specifically for Hero)
        const hero = document.getElementById('hero');
        if (hero) {
            hero.addEventListener('mousemove', (e) => {
                const { clientX, clientY } = e;
                const { innerWidth, innerHeight } = window;
                const moveX = (clientX - innerWidth / 2) / innerWidth;
                const moveY = (clientY - innerHeight / 2) / innerHeight;

                parallaxEls.forEach(el => {
                    const speed = (+el.getAttribute('data-speed') || 0.1) * 30; // Sensibilidade
                    el.style.transform = `translate(${moveX * speed}px, ${moveY * speed}px)`;
                });
            });

            // Reset position when mouse leaves
            hero.addEventListener('mouseleave', () => {
                parallaxEls.forEach(el => {
                    el.style.transform = `translate(0, 0)`;
                });
            });
        }
    }



    // --- Navbar Scroll ---
    const navbar = document.getElementById('navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            navbar.classList.toggle('scrolled', window.scrollY > 50);
        });
    }


    // --- Hamburger Menu ---
    const hamburger = document.getElementById('nav-hamburger');
    const navLinks = document.getElementById('nav-links');
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('open');
        });
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navLinks.classList.remove('open');
            });
        });
    }


    // --- Reveal Animations ---
    const revealEls = document.querySelectorAll('.reveal');
    if (revealEls.length) {
        const io = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });
        revealEls.forEach(el => io.observe(el));
    }


    // --- Sovereign Video Player Logic (Universal) ---
    function initSovereignPlayer() {
        document.querySelectorAll('.video-controls-overlay').forEach(overlay => {
            const container = overlay.parentElement;
            const video = container.querySelector('video');
            const playBtn = overlay.querySelector('.edu-play-pause');
            const muteBtn = overlay.querySelector('.edu-mute');

            if (playBtn && video) {
                // Sincronizar ícone inicial
                playBtn.innerHTML = video.paused ? '<i data-lucide="play"></i>' : '<i data-lucide="pause"></i>';

                playBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (video.paused) {
                        // Pausar outros vídeos globais para evitar cacofonia
                        document.querySelectorAll('video').forEach(v => {
                            if (v !== video) {
                                v.pause();
                                // Tentar achar o botão desse outro vídeo para resetar ícone
                                const otherPlayBtn = v.parentElement?.querySelector('.edu-play-pause');
                                if (otherPlayBtn) otherPlayBtn.innerHTML = '<i data-lucide="play"></i>';
                            }
                        });
                        video.play();
                        playBtn.innerHTML = '<i data-lucide="pause"></i>';
                    } else {
                        video.pause();
                        playBtn.innerHTML = '<i data-lucide="play"></i>';
                    }
                    if (window.lucide) lucide.createIcons();
                });
            }

            if (muteBtn && video) {
                muteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    video.muted = !video.muted;
                    video.volume = 0.2;
                    muteBtn.innerHTML = video.muted ? '<i data-lucide="volume-x"></i>' : '<i data-lucide="volume-2"></i>';
                    if (window.lucide) lucide.createIcons();
                });
            }
        });
    }
    initSovereignPlayer();
    // Expor para re-inicialização dinâmica se necessário (ex: carrossel clona itens)
    window.initSovereignPlayer = initSovereignPlayer;


    // --- Gallery Modal ---
    const modal = document.getElementById('photo-modal');
    if (modal) {
        const modalImg = document.getElementById('modal-img');
        const imgs = Array.from(document.querySelectorAll('.gallery-item img'));
        const prevBtn = modal.querySelector('.modal-prev');
        const nextBtn = modal.querySelector('.modal-next');
        let idx = 0;

        function updateModal() {
            if (modalImg) {
                modalImg.classList.add('changing');
                setTimeout(() => {
                    modalImg.src = imgs[idx].src;
                    modalImg.onload = () => {
                        modalImg.classList.remove('changing');
                    };
                }, 300);
            }
        }

        function triggerBtnAnim(btn) {
            if (!btn) return;
            btn.classList.add('clicked');
            setTimeout(() => btn.classList.remove('clicked'), 600);
        }

        function open(i) {
            idx = i;
            updateModal();
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('active'), 10);
            document.body.style.overflow = 'hidden';
        }


        imgs.forEach((img, i) => img.parentElement.addEventListener('click', () => open(i)));

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                triggerBtnAnim(prevBtn);
                idx = (idx - 1 + imgs.length) % imgs.length;
                updateModal();
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                triggerBtnAnim(nextBtn);
                idx = (idx + 1) % imgs.length;
                updateModal();
            });
        }


        const closeBtn = document.querySelector('.modal-close');
        if (closeBtn) closeBtn.addEventListener('click', () => {
            modal.classList.remove('active');
            setTimeout(() => { modal.style.display = 'none'; }, 500);
            document.body.style.overflow = 'auto';
        });

        // Close on click outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
                setTimeout(() => { modal.style.display = 'none'; }, 500);
                document.body.style.overflow = 'auto';
            }
        });
    }
});
