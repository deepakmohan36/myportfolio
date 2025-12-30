
(function() {
  "use strict";

	/**
	 * Backend API base URL (configurable via window.API_BASE_URL from HTML)
	 */
	const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8080';

	let authToken = null;
	let currentUser = null;

  /**
   * Easy selector helper function
   */
  const select = (el, all = false) => {
    el = el.trim()
    if (all) {
      return [...document.querySelectorAll(el)]
    } else {
      return document.querySelector(el)
    }
  }

  /**
   * Easy event listener function
   */
  const on = (type, el, listener, all = false) => {
    let selectEl = select(el, all)
    if (selectEl) {
      if (all) {
        selectEl.forEach(e => e.addEventListener(type, listener))
      } else {
        selectEl.addEventListener(type, listener)
      }
    }
  }

  /**
   * Easy on scroll event listener 
   */
  const onscroll = (el, listener) => {
    el.addEventListener('scroll', listener)
  }

  /**
   * Navbar links active state on scroll
   */
  let navbarlinks = select('#navbar .scrollto', true)
  const navbarlinksActive = () => {
    let position = window.scrollY + 200
    navbarlinks.forEach(navbarlink => {
      if (!navbarlink.hash) return
      let section = select(navbarlink.hash)
      if (!section) return
      if (position >= section.offsetTop && position <= (section.offsetTop + section.offsetHeight)) {
        navbarlink.classList.add('active')
      } else {
        navbarlink.classList.remove('active')
      }
    })
  }
  window.addEventListener('load', navbarlinksActive)
  onscroll(document, navbarlinksActive)

  /**
   * Scrolls to an element with header offset
   */
  const scrollto = (el) => {
    let elementPos = select(el).offsetTop
    window.scrollTo({
      top: elementPos,
      behavior: 'smooth'
    })
  }

  /**
   * Back to top button
   */
  let backtotop = select('.back-to-top')
  if (backtotop) {
    const toggleBacktotop = () => {
      if (window.scrollY > 100) {
        backtotop.classList.add('active')
      } else {
        backtotop.classList.remove('active')
      }
    }
    window.addEventListener('load', toggleBacktotop)
    onscroll(document, toggleBacktotop)
  }

  /**
   * Mobile nav toggle
   */
  on('click', '.mobile-nav-toggle', function(e) {
    select('body').classList.toggle('mobile-nav-active')
    this.classList.toggle('bi-list')
    this.classList.toggle('bi-x')
  })

  /**
   * Scrool with ofset on links with a class name .scrollto
   */
  on('click', '.scrollto', function(e) {
    if (select(this.hash)) {
      e.preventDefault()

      let body = select('body')
      if (body.classList.contains('mobile-nav-active')) {
        body.classList.remove('mobile-nav-active')
        let navbarToggle = select('.mobile-nav-toggle')
        navbarToggle.classList.toggle('bi-list')
        navbarToggle.classList.toggle('bi-x')
      }
      scrollto(this.hash)
    }
  }, true)

  /**
   * Scroll with ofset on page load with hash links in the url
   */
  window.addEventListener('load', () => {
    if (window.location.hash) {
      if (select(window.location.hash)) {
        scrollto(window.location.hash)
      }
    }
  });

  /**
   * Hero type effect
   */
  const typed = select('.typed')
  if (typed) {
    let typed_strings = typed.getAttribute('data-typed-items')
    typed_strings = typed_strings.split(',')
    new Typed('.typed', {
      strings: typed_strings,
      loop: true,
      typeSpeed: 100,
      backSpeed: 50,
      backDelay: 2000
    });
  }

  /**
   * Skills animation
   */
  let skilsContent = select('.skills-content');
  if (skilsContent) {
    new Waypoint({
      element: skilsContent,
      offset: '80%',
      handler: function(direction) {
        let progress = select('.progress .progress-bar', true);
        progress.forEach((el) => {
          el.style.width = el.getAttribute('aria-valuenow') + '%'
        });
      }
    })
  }

  /**
   * Porfolio isotope and filter
   */
  window.addEventListener('load', () => {
    let portfolioContainer = select('.portfolio-container');
    if (portfolioContainer) {
      let portfolioIsotope = new Isotope(portfolioContainer, {
        itemSelector: '.portfolio-item'
      });

      let portfolioFilters = select('#portfolio-flters li', true);

      on('click', '#portfolio-flters li', function(e) {
        e.preventDefault();
        portfolioFilters.forEach(function(el) {
          el.classList.remove('filter-active');
        });
        this.classList.add('filter-active');

        portfolioIsotope.arrange({
          filter: this.getAttribute('data-filter')
        });
        portfolioIsotope.on('arrangeComplete', function() {
          AOS.refresh()
        });
      }, true);
    }

  });

  /**
   * Initiate portfolio lightbox 
   */
  const portfolioLightbox = GLightbox({
    selector: '.portfolio-lightbox'
  });

  /**
   * Portfolio details slider
   */
  new Swiper('.portfolio-details-slider', {
    speed: 400,
    loop: true,
    autoplay: {
      delay: 5000,
      disableOnInteraction: false
    },
    pagination: {
      el: '.swiper-pagination',
      type: 'bullets',
      clickable: true
    }
  });

  /**
   * Testimonials slider
   */
  new Swiper('.testimonials-slider', {
    speed: 600,
    loop: true,
    autoplay: {
      delay: 5000,
      disableOnInteraction: false
    },
    slidesPerView: 'auto',
    pagination: {
      el: '.swiper-pagination',
      type: 'bullets',
      clickable: true
    },
    breakpoints: {
      320: {
        slidesPerView: 1,
        spaceBetween: 20
      },

      1200: {
        slidesPerView: 3,
        spaceBetween: 20
      }
    }
  });

	  /**
	   * Scroll progress indicator
	   */
	  const scrollProgress = select('#scroll-progress');
	  if (scrollProgress) {
	    const updateScrollProgress = () => {
	      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
	      const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
	      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
	      scrollProgress.style.width = progress + '%';
	    }
	    window.addEventListener('load', updateScrollProgress);
	    onscroll(document, updateScrollProgress);
	  }

	  /**
	   * Theme toggle (dark / light)
	   */
	  const THEME_STORAGE_KEY = 'dm-portfolio-theme';

	  const applyTheme = (theme) => {
	    const body = document.body;
	    if (!body) return;

	    body.classList.remove('dark-theme', 'light-theme');
	    if (theme === 'light') {
	      body.classList.add('light-theme');
	    } else {
	      body.classList.add('dark-theme');
	    }

	    const toggles = select('.theme-toggle', true);
	    if (toggles) {
	      toggles.forEach(btn => {
	        btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
	      });
	    }
	  }

	  const getPreferredTheme = () => {
	    try {
	      const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
	      if (stored === 'light' || stored === 'dark') {
	        return stored;
	      }
	    } catch (e) {
	      // localStorage might be unavailable; ignore and fallback
	    }
	    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
	      return 'light';
	    }
	    return 'dark';
	  }

	  window.addEventListener('load', () => {
	    const initialTheme = getPreferredTheme();
	    applyTheme(initialTheme);

	    const toggles = select('.theme-toggle', true);
	    if (toggles) {
	      toggles.forEach(btn => {
	        btn.addEventListener('click', () => {
	          const isDark = document.body.classList.contains('dark-theme');
	          const nextTheme = isDark ? 'light' : 'dark';
	          applyTheme(nextTheme);
	          try {
	            window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
	          } catch (e) {
	            // ignore write errors
	          }
	        });
	      });
	    }
	  });

	  /**
	   * Animation on scroll
	   */
	  window.addEventListener('load', () => {
	    AOS.init({
	      duration: 1000,
	      easing: 'ease-in-out',
	      once: true,
	      mirror: false
	    })
	  });

	  /**
	   * Initiate Pure Counter 
	   */
	  new PureCounter();

	  /**
	   * BLOG / AUTH INTEGRATION (matches Go server in /server)
	   */

		  const loadStoredAuth = () => {
		    try {
		      const raw = window.localStorage.getItem('dm-blog-auth');
		      if (!raw) return;
		      const parsed = JSON.parse(raw);
		      if (parsed && parsed.token && parsed.userId && parsed.username) {
		        authToken = parsed.token;
		        currentUser = {
		          id: parsed.userId,
		          username: parsed.username,
		          role: parsed.role || 'user',
		          avatarUrl: parsed.avatarUrl || null
		        };
		      }
		    } catch (e) {
		      authToken = null;
		      currentUser = null;
		    }
		  };

	  const persistAuth = () => {
	    if (!authToken || !currentUser) {
	      try {
	        window.localStorage.removeItem('dm-blog-auth');
	      } catch (e) {}
	      return;
	    }
		    try {
		      window.localStorage.setItem('dm-blog-auth', JSON.stringify({
		        token: authToken,
		        	userId: currentUser.id,
		        	username: currentUser.username,
		        	role: currentUser.role,
		        	avatarUrl: currentUser.avatarUrl || null
		      }));
		    } catch (e) {}
	  };

	  const clearAuth = () => {
	    authToken = null;
	    currentUser = null;
	    persistAuth();
	  };
		
		  const hideAuthModal = () => {
		    const modalEl = document.getElementById('auth-modal');
		    if (!modalEl || !window.bootstrap || !window.bootstrap.Modal) return;
		    const Modal = window.bootstrap.Modal;
		    const existing = Modal.getInstance(modalEl) || new Modal(modalEl);
		    existing.hide();
		  };

		  const showBlogStatus = (message, type = 'info') => {
		    const statusEl = select('#blog-status');
		    if (!statusEl) return;
		    statusEl.textContent = message;
		    statusEl.classList.remove('d-none', 'alert-info', 'alert-success', 'alert-danger');
		    const alertClass = type === 'error' ? 'alert-danger' : (type === 'success' ? 'alert-success' : 'alert-info');
		    statusEl.classList.add('alert', alertClass);
		  };

		  const showAdminUsersStatus = (message, type = 'info') => {
		    const statusEl = select('#admin-users-status');
		    if (!statusEl) return;
		    statusEl.textContent = message;
		    statusEl.classList.remove('d-none', 'alert-info', 'alert-success', 'alert-danger');
		    const alertClass = type === 'error'
		      ? 'alert-danger'
		      : (type === 'success' ? 'alert-success' : 'alert-info');
		    statusEl.classList.add('alert', alertClass);
		  };

			  const showAuthStatus = (message, type = 'info') => {
			    const statusEl = select('#auth-status');
			    if (!statusEl) return;
			    statusEl.textContent = message;
			    statusEl.classList.remove('d-none', 'alert-info', 'alert-success', 'alert-danger');
			    const alertClass = type === 'error' ? 'alert-danger' : (type === 'success' ? 'alert-success' : 'alert-info');
			    statusEl.classList.add('alert', alertClass);
			  };

										  let allPosts = [];
										  let activeCategoryFilter = '';
										  let editingPostId = null;
										  let currentPostsPage = 1;
										  let totalPostsPages = 1;
										  const POSTS_PER_PAGE = 10;
										  let currentPostsLayout = 'modern'; // 'card' | 'modern'
							  let currentPostsSortField = null; // 'title' | 'category' | 'created_at'
							  let currentPostsSortDirection = 'asc'; // 'asc' | 'desc'
							  let currentPostsSearchQuery = ''; // free-text search across title, description, category, and body

							  const POST_COVER_IMAGES = {
							    'cover-1': 'assets/img/blog-covers/cover-1.jpg',
							    'cover-2': 'assets/img/blog-covers/cover-2.jpg',
							    'cover-3': 'assets/img/blog-covers/cover-3.jpg',
							    'cover-4': 'assets/img/blog-covers/cover-4.jpg',
							    'cover-5': 'assets/img/blog-covers/cover-5.jpg',
							    'cover-6': 'assets/img/blog-covers/cover-6.jpg',
							    'cover-7': 'assets/img/blog-covers/cover-7.jpg',
							    'cover-8': 'assets/img/blog-covers/cover-8.jpg',
							    'cover-9': 'assets/img/blog-covers/cover-9.jpg',
							    'cover-10': 'assets/img/blog-covers/cover-10.jpg',
							  };

							  const resolvePostCoverUrl = (key) => {
							    if (!key || typeof key !== 'string') return '';
							    return POST_COVER_IMAGES[key] || '';
							  };

									  // Map of user ID -> username for admin post analytics.
										  let adminUsersById = {};
									  const deriveDisplayNameFromIdentifier = (identifier) => {
									    if (!identifier || typeof identifier !== 'string') return '';
									    let base = identifier;
									    const atIndex = base.indexOf('@');
									    if (atIndex > 0) base = base.slice(0, atIndex);
									    base = base.replace(/[._\-]+/g, ' ').trim();
									    if (!base) return identifier;
									    return base
									      .split(/\s+/)
									      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
									      .join(' ');
									  };
									
								  const formatDayWithOrdinal = (day) => {
								    const d = Number(day);
								    if (!Number.isFinite(d)) return String(day);
								    if (d >= 11 && d <= 13) return `${d}th`;
								    switch (d % 10) {
								      case 1:
								        return `${d}st`;
								      case 2:
								        return `${d}nd`;
								      case 3:
								        return `${d}rd`;
								      default:
								        return `${d}th`;
								    }
								  };
								
								  // Format a date as a relative string like "Today", "Yesterday",
								  // "2 days ago", "1 week ago", etc.
								  const formatPrettyDate = (date) => {
								    if (!(date instanceof Date)) return '';
								    const time = date.getTime();
								    if (Number.isNaN(time)) return '';
								    const now = Date.now();
								    const diffMs = now - time;
								    const dayMs = 24 * 60 * 60 * 1000;
								    const days = Math.floor(diffMs / dayMs);
								
								    if (days <= 0) return 'Today';
								    if (days === 1) return 'Yesterday';
								    if (days < 7) return `${days} days ago`;
								
								    const weeks = Math.floor(days / 7);
								    if (weeks === 1) return '1 week ago';
								    if (weeks < 5) return `${weeks} weeks ago`;
								
								    const months = Math.floor(days / 30);
								    if (months === 1) return '1 month ago';
								    if (months < 12) return `${months} months ago`;
								
								    const years = Math.floor(days / 365);
								    if (years <= 1) return '1 year ago';
								    return `${years} years ago`;
								  };
										  
										  // --- Basic Markdown rendering for blog posts ---
										  // We keep content stored as plain text/Markdown in the backend, but render
										  // a small, safe subset (headings, lists, paragraphs, inline emphasis) for
										  // readers in the overlay view.
										  const escapeHtml = (str) => {
										    if (!str) return '';
										    return String(str)
										      .replace(/&/g, '&amp;')
										      .replace(/</g, '&lt;')
										      .replace(/>/g, '&gt;')
										      .replace(/"/g, '&quot;')
										      .replace(/'/g, '&#39;');
										  };
										  
										  const applyInlineMarkdownFormatting = (text) => {
										    if (!text) return '';
										    let formatted = text;
										    // Bold: **text** or __text__
										    formatted = formatted
										      .replace(/\*\*(.+?)\*\*/g, '<strong>$1<\/strong>')
										      .replace(/__(.+?)__/g, '<strong>$1<\/strong>');
										    // Italic: *text* or _text_
										    formatted = formatted
										      .replace(/\*(.+?)\*/g, '<em>$1<\/em>')
										      .replace(/_(.+?)_/g, '<em>$1<\/em>');
										    // Inline code: `code`
										    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1<\/code>');
										    return formatted;
										  };
										  
										  const renderBasicMarkdown = (markdown) => {
										    if (!markdown) return '';
										    const escaped = escapeHtml(markdown);
										    const lines = escaped.split(/\r?\n/);
										    const htmlLines = [];
										    let inList = false;
										  
										    const closeList = () => {
										      if (inList) {
										        htmlLines.push('</ul>');
										        inList = false;
										      }
										    };
										  
										    for (let i = 0; i < lines.length; i += 1) {
										      const rawLine = lines[i];
										      const line = rawLine.trimEnd();
										  
										      if (!line.trim()) {
										        // Blank line -> paragraph / list separator.
										        closeList();
										        continue;
										      }
										  
										      const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
										      if (headingMatch) {
										        closeList();
										        const level = headingMatch[1].length;
										        const text = applyInlineMarkdownFormatting(headingMatch[2].trim());
										        htmlLines.push(`<h${level}>${text}<\/h${level}>`);
										        continue;
										      }
										  
										      const listMatch = line.match(/^[-*]\s+(.*)$/);
										      if (listMatch) {
										        if (!inList) {
										          inList = true;
										          htmlLines.push('<ul>');
										        }
										        const itemText = applyInlineMarkdownFormatting(listMatch[1].trim());
										        htmlLines.push(`<li>${itemText}<\/li>`);
										        continue;
										      }
										  
										      closeList();
										      const paragraphText = applyInlineMarkdownFormatting(line.trim());
										      htmlLines.push(`<p>${paragraphText}<\/p>`);
										    }
										  
										    closeList();
										    return htmlLines.join('\n');
										  };
								
										  // Centered reader view overlay for blog posts
										  let postReaderOverlay = null;
										  let postReaderDialog = null;
										  let postReaderBody = null;
										  let postReaderReactions = null;
								  let postReaderInitialized = false;
								  let postReaderCommentsList = null;
								  let postReaderCommentsMoreBtn = null;
								  let postReaderCommentForm = null;
								  let postReaderCommentInput = null;
								  let postReaderCommentsTitle = null;
								  let postReaderCurrentPostId = null;
								  let postReaderComments = [];
								  let postReaderShowAllComments = false;
								  const POST_READER_INITIAL_COMMENTS = 10;

								  const resetPostReaderCommentsState = () => {
								    postReaderComments = [];
								    postReaderShowAllComments = false;
								    if (postReaderCommentsList) {
								      postReaderCommentsList.innerHTML = '';
								    }
								    if (postReaderCommentsMoreBtn) {
								      postReaderCommentsMoreBtn.classList.add('d-none');
								    }
								    if (postReaderCommentInput) {
								      postReaderCommentInput.value = '';
								    }
								    if (postReaderCommentsTitle) {
								      postReaderCommentsTitle.textContent = 'Comments';
								    }
								  };

								  const renderPostReaderComments = () => {
								    if (!postReaderCommentsList) return;
								    const commentsArray = Array.isArray(postReaderComments) ? postReaderComments : [];
								    const total = commentsArray.length;

								    postReaderCommentsList.innerHTML = '';

								    if (postReaderCommentsTitle) {
								      if (!total) {
								        postReaderCommentsTitle.textContent = 'Comments';
								      } else if (total === 1) {
								        postReaderCommentsTitle.textContent = '1 comment';
								      } else {
								        postReaderCommentsTitle.textContent = `${total} comments`;
								      }
								    }

								    if (!total) {
								      const empty = document.createElement('li');
								      empty.className = 'blog-post-comment-empty small text-muted';
								      empty.textContent = 'No comments yet. Be the first to share a thought.';
								      postReaderCommentsList.appendChild(empty);
								    } else {
								      const limit = postReaderShowAllComments ? total : POST_READER_INITIAL_COMMENTS;
								      const startIndex = Math.max(total - limit, 0);
								      const visible = commentsArray.slice(startIndex);

								      visible.forEach((comment) => {
								        if (!comment) return;
								        const li = document.createElement('li');
								        li.className = 'blog-post-comment';

								        const header = document.createElement('div');
								        header.className = 'blog-post-comment-header d-flex justify-content-between align-items-baseline';

								        const authorEl = document.createElement('span');
								        authorEl.className = 'blog-post-comment-author fw-semibold';
						const rawAuthor = comment.author_name || comment.authorName || '';
						const displayName = deriveDisplayNameFromIdentifier(rawAuthor) || rawAuthor || 'Anonymous';
						authorEl.textContent = displayName;

								        const metaEl = document.createElement('span');
								        metaEl.className = 'blog-post-comment-meta small text-muted';
								        const createdRaw = comment.created_at || comment.createdAt || comment.CreatedAt;
								        if (createdRaw) {
								          const createdDate = new Date(createdRaw);
								          if (!Number.isNaN(createdDate.getTime())) {
								            metaEl.textContent = formatPrettyDate(createdDate);
								          }
								        }

								        header.appendChild(authorEl);
								        header.appendChild(metaEl);

								        const contentEl = document.createElement('p');
								        contentEl.className = 'blog-post-comment-content mb-0';
								        contentEl.textContent = comment.content || '';

								        li.appendChild(header);
								        li.appendChild(contentEl);
								        postReaderCommentsList.appendChild(li);
								      });
								    }

								    if (!postReaderCommentsMoreBtn) return;
								    if (total > POST_READER_INITIAL_COMMENTS) {
								      postReaderCommentsMoreBtn.classList.remove('d-none');
								      if (postReaderShowAllComments) {
								        postReaderCommentsMoreBtn.textContent = 'Show less';
								      } else {
								        postReaderCommentsMoreBtn.textContent = `Show all ${total} comments`;
								      }
								    } else {
								      postReaderCommentsMoreBtn.classList.add('d-none');
								    }
								  };

								  const loadPostComments = async (postId) => {
								    if (!postId || !postReaderCommentsList) return;
								    const numericId = Number(postId);
								    if (!Number.isFinite(numericId) || numericId <= 0) return;

								    try {
								      const response = await apiRequest(`/posts/${numericId}/comments`, { method: 'GET' });
								      postReaderComments = Array.isArray(response) ? response : [];
								      renderPostReaderComments();
								    } catch (err) {
								      console.error(err);
								      // We keep the comments area silent on failure to avoid
								      // overwhelming the reader. Main blog status remains available
								      // for error messaging.
								    }
								  };
						
					  const closePostReader = () => {
					    if (!postReaderOverlay) return;
					    postReaderOverlay.classList.add('d-none');
					    document.body.classList.remove('post-reader-open');
					  };
								
					  const handleReactionClick = async (reactionBtn) => {
					    if (!currentUser || !authToken) {
					      showBlogStatus('Please log in to react to posts.', 'error');
					      return;
					    }
								
					    const reactionsContainer = reactionBtn.closest('.blog-reactions');
					    if (!(reactionsContainer instanceof HTMLElement)) return;
					    const postId = reactionsContainer.dataset.postId;
					    if (!postId) return;
								
					    const isLike = reactionBtn.classList.contains('blog-like-btn');
					    const reaction = isLike ? 'like' : 'dislike';
								
					    try {
					      const data = await apiRequest(`/posts/${postId}/react`, {
					        method: 'POST',
					        headers: { 'Content-Type': 'application/json' },
					        body: JSON.stringify({ reaction })
					      });
								
					      // Update all reaction containers for this post (cards, list, reader).
					      const selector = `.blog-reactions[data-post-id="${postId}"]`;
					      const allReactions = document.querySelectorAll(selector);
					      allReactions.forEach((container) => {
					        if (!(container instanceof HTMLElement)) return;
					        const likeCountEl = container.querySelector('.blog-like-count');
					        const dislikeCountEl = container.querySelector('.blog-dislike-count');
					        if (likeCountEl && typeof data.likes_count === 'number') {
					          likeCountEl.textContent = String(data.likes_count);
					        }
					        if (dislikeCountEl && typeof data.dislikes_count === 'number') {
					          dislikeCountEl.textContent = String(data.dislikes_count);
					        }
								
					        const likeBtnEl = container.querySelector('.blog-like-btn');
					        const dislikeBtnEl = container.querySelector('.blog-dislike-btn');
					        if (likeBtnEl instanceof HTMLElement && dislikeBtnEl instanceof HTMLElement) {
					          likeBtnEl.classList.remove('btn-success');
					          likeBtnEl.classList.add('btn-outline-success');
					          dislikeBtnEl.classList.remove('btn-danger');
					          dislikeBtnEl.classList.add('btn-outline-danger');
								
					          if (data.user_reaction === 'like') {
					            likeBtnEl.classList.remove('btn-outline-success');
					            likeBtnEl.classList.add('btn-success');
					          } else if (data.user_reaction === 'dislike') {
					            dislikeBtnEl.classList.remove('btn-outline-danger');
					            dislikeBtnEl.classList.add('btn-danger');
					          }
					        }
					      });
								
					      // Sync in-memory post data and admin view.
					      const numericId = Number(postId);
					      const idx = allPosts.findIndex((p) => p.id === numericId);
					      if (idx !== -1) {
					        if (typeof data.likes_count === 'number') allPosts[idx].likes_count = data.likes_count;
					        if (typeof data.dislikes_count === 'number') allPosts[idx].dislikes_count = data.dislikes_count;
					      }
					      renderAdminPosts();
					    } catch (err) {
					      console.error(err);
					      showBlogStatus(err.message || 'Could not update reaction.', 'error');
					    }
					  };
								
										  const ensurePostReader = () => {
							    if (postReaderInitialized) return;
							    postReaderOverlay = document.getElementById('post-reader-overlay');
							    if (!postReaderOverlay) {
							      postReaderOverlay = document.createElement('div');
							      postReaderOverlay.id = 'post-reader-overlay';
								      postReaderOverlay.className = 'blog-post-reader-overlay d-none';
									      postReaderOverlay.innerHTML = `
									        <div class="blog-post-reader-dialog" role="dialog" aria-modal="true">
									          <div class="blog-post-reader-header d-flex justify-content-end mb-2">
									            <button type="button" class="btn-close blog-post-reader-close" aria-label="Close"></button>
									          </div>
									          <div class="blog-post-reader-body"></div>
									          <div class="blog-post-reader-reactions mt-3 d-flex align-items-center"></div>
									          <div class="blog-post-reader-comments mt-4">
									            <div class="d-flex justify-content-between align-items-baseline mb-2">
									              <h6 class="blog-post-reader-comments-title mb-0">Comments</h6>
									            </div>
									            <ul class="blog-post-reader-comments-list list-unstyled mb-2"></ul>
									            <button type="button" class="btn btn-link btn-sm p-0 blog-post-reader-comments-more d-none"></button>
									            <form class="blog-post-reader-comment-form mt-3">
									              <label class="visually-hidden" for="blog-post-reader-comment-input">Add a comment</label>
									              <div class="input-group input-group-sm">
									                <textarea
									                  id="blog-post-reader-comment-input"
									                  class="form-control blog-post-reader-comment-input"
									                  rows="2"
									                  placeholder="Add a comment..."
									                  maxlength="2000"
									                ></textarea>
									                <button
									                  type="submit"
									                  class="btn btn-primary blog-post-reader-comment-submit"
									                >Post</button>
									              </div>
									            </form>
									          </div>
									        </div>
									      `;
							      document.body.appendChild(postReaderOverlay);
							    }
							    postReaderDialog = postReaderOverlay.querySelector('.blog-post-reader-dialog');
							    postReaderBody = postReaderOverlay.querySelector('.blog-post-reader-body');
								    			    postReaderReactions = postReaderOverlay.querySelector('.blog-post-reader-reactions');
								    postReaderCommentsList = postReaderOverlay.querySelector('.blog-post-reader-comments-list');
								    postReaderCommentsMoreBtn = postReaderOverlay.querySelector('.blog-post-reader-comments-more');
								    postReaderCommentForm = postReaderOverlay.querySelector('.blog-post-reader-comment-form');
								    postReaderCommentInput = postReaderOverlay.querySelector('.blog-post-reader-comment-input');
								    postReaderCommentsTitle = postReaderOverlay.querySelector('.blog-post-reader-comments-title');
						
    const closeBtn = postReaderOverlay.querySelector('.blog-post-reader-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', (event) => {
        event.preventDefault();
        closePostReader();
      });
    }

    // Clicking on the darkened background (outside the dialog) closes the reader.
    // Clicks inside the dialog (including reactions) should NOT close it.
    postReaderOverlay.addEventListener('click', (event) => {
	      if (event.target === postReaderOverlay) {
	        closePostReader();
	      }
    });
						
						    document.addEventListener('keydown', (event) => {
						      if (event.key === 'Escape') {
						        closePostReader();
						      }
						    });

								    if (postReaderCommentsMoreBtn) {
								      postReaderCommentsMoreBtn.addEventListener('click', (event) => {
								        event.preventDefault();
								        postReaderShowAllComments = !postReaderShowAllComments;
								        renderPostReaderComments();
								        if (postReaderDialog) {
								          postReaderDialog.scrollTop = postReaderDialog.scrollHeight;
								        }
								      });
								    }

								    if (postReaderCommentForm && postReaderCommentInput) {
								      postReaderCommentForm.addEventListener('submit', async (event) => {
								        event.preventDefault();

								        if (!currentUser || !authToken) {
								          showBlogStatus('Please log in to comment on posts.', 'error');
								          return;
								        }

								        const raw = postReaderCommentInput.value || '';
								        const content = raw.trim();
								        if (!content) {
								          return;
								        }

								        const postId = postReaderCurrentPostId;
								        if (!postId) return;

								        try {
								          const numericId = Number(postId);
								          if (!Number.isFinite(numericId) || numericId <= 0) return;

								          const data = await apiRequest(`/posts/${numericId}/comments`, {
								            method: 'POST',
								            headers: { 'Content-Type': 'application/json' },
								            body: JSON.stringify({ content })
								          });

								          const newComment = data && (data.comment || data.Comment);
								          if (newComment) {
								            postReaderComments.push(newComment);
								            postReaderShowAllComments = true;
								            postReaderCommentInput.value = '';
								            renderPostReaderComments();
								          } else {
								            // Fallback: reload full comment thread if response
								            // did not include the created comment.
								            await loadPostComments(postId);
								          }
								        } catch (err) {
								          console.error(err);
								          showBlogStatus(err.message || 'Could not post comment.', 'error');
								        }
								      });
								    }
						
						    postReaderInitialized = true;
						  };
						
								  const openPostInReader = (item) => {
								    ensurePostReader();
								    if (!postReaderOverlay || !postReaderBody) return;
								  
								    const postId = item.dataset.postId || '';
								    const body = item.dataset.body || '';
								  
								    postReaderCurrentPostId = postId || null;
								    resetPostReaderCommentsState();
								  
								    // Render Markdown (headings, lists, emphasis) for a better reading
								    // experience in the overlay, while keeping stored content as plain
								    // text/Markdown.
								    postReaderBody.innerHTML = renderBasicMarkdown(body);
								  
								    // Render reactions inside the expanded reader view.
								    if (postReaderReactions) {
								      postReaderReactions.innerHTML = '';
								      if (postId) {
								        const numericId = Number(postId);
								        const post = allPosts.find((p) => p && p.id === numericId);
								        const likesCount = post && typeof post.likes_count === 'number' ? post.likes_count : 0;
								        const dislikesCount = post && typeof post.dislikes_count === 'number'
								          ? post.dislikes_count
								          : 0;
								      
								        const reactions = document.createElement('div');
								        reactions.className = 'd-flex align-items-center blog-reactions';
								        reactions.dataset.postId = String(postId);
								      
								        const likeBtn = document.createElement('button');
								        likeBtn.type = 'button';
								        likeBtn.className = 'btn btn-sm btn-outline-success blog-like-btn blog-reaction-btn';
								        likeBtn.setAttribute('aria-label', 'Like post');
								        const likeIcon = document.createElement('span');
								        likeIcon.className = 'blog-reaction-icon';
								        likeIcon.textContent = '👍';
								        const likeCount = document.createElement('span');
								        likeCount.className = 'blog-like-count';
								        likeCount.textContent = String(likesCount);
								        likeBtn.appendChild(likeIcon);
								        likeBtn.appendChild(likeCount);
								      
								        // In the reader, handle like clicks directly on the button so the
								        // overlay never interprets them as background clicks.
								        likeBtn.addEventListener('click', async (event) => {
								          event.preventDefault();
								          event.stopPropagation();
								          await handleReactionClick(likeBtn);
								        });
								      
								        const dislikeBtn = document.createElement('button');
								        dislikeBtn.type = 'button';
								        dislikeBtn.className = 'btn btn-sm btn-outline-danger blog-dislike-btn blog-reaction-btn';
								        dislikeBtn.setAttribute('aria-label', 'Dislike post');
								        const dislikeIcon = document.createElement('span');
								        dislikeIcon.className = 'blog-reaction-icon';
								        dislikeIcon.textContent = '👎';
								        const dislikeCount = document.createElement('span');
								        dislikeCount.className = 'blog-dislike-count';
								        dislikeCount.textContent = String(dislikesCount);
								        dislikeBtn.appendChild(dislikeIcon);
								        dislikeBtn.appendChild(dislikeCount);
								      
								        // Same for dislike: keep the reader open and only update reactions.
								        dislikeBtn.addEventListener('click', async (event) => {
								          event.preventDefault();
								          event.stopPropagation();
								          await handleReactionClick(dislikeBtn);
								        });
								      
								        reactions.appendChild(likeBtn);
								        reactions.appendChild(dislikeBtn);
								        postReaderReactions.appendChild(reactions);
								      }
								    }
								  
								    if (postId) {
								      loadPostComments(postId);
								    }
								  
								    postReaderOverlay.classList.remove('d-none');
								    document.body.classList.add('post-reader-open');
								    if (postReaderDialog) {
								      postReaderDialog.setAttribute('tabindex', '-1');
								      postReaderDialog.focus();
								    }
								  };
						
				  const applyPostFiltersAndRender = () => {
			    // Start from all posts, then filter, sort, and paginate.
			    let postsToRender = Array.isArray(allPosts) ? allPosts.slice() : [];
			    
			    // Filter by active category, if any.
			    if (activeCategoryFilter) {
			      postsToRender = postsToRender.filter((post) => (post.category || '') === activeCategoryFilter);
			    }
				    
				    // Apply free-text search across title, description, category, and body.
				    const search = (currentPostsSearchQuery || '').trim().toLowerCase();
				    if (search) {
				      postsToRender = postsToRender.filter((post) => {
				        if (!post) return false;
				        const title = (post.title || '').toLowerCase();
				        const description = (post.description || '').toLowerCase();
				        const category = (post.category || '').toLowerCase();
				        const body = (post.content || '').toLowerCase();
				        return (
				          title.includes(search) ||
				          description.includes(search) ||
				          category.includes(search) ||
				          body.includes(search)
				        );
				      });
				    }
				    
			    // Apply sort if a sort field is active (used primarily in list view).
			    if (currentPostsSortField) {
			      const field = currentPostsSortField;
			      const direction = currentPostsSortDirection === 'desc' ? -1 : 1;
			      postsToRender.sort((a, b) => {
			        if (!a && !b) return 0;
			        if (!a) return 1;
			        if (!b) return -1;
			        
			        if (field === 'created_at') {
			          const aHas = !!a.created_at;
			          const bHas = !!b.created_at;
			          if (!aHas && !bHas) return 0;
			          if (!aHas) return 1;
			          if (!bHas) return -1;
			          const aTime = new Date(a.created_at).getTime();
			          const bTime = new Date(b.created_at).getTime();
			          if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
			          if (Number.isNaN(aTime)) return 1;
			          if (Number.isNaN(bTime)) return -1;
			          if (aTime === bTime) return 0;
			          return aTime < bTime ? -1 * direction : 1 * direction;
			        }
			        
			        const aVal = ((a[field] || '') + '').toLowerCase();
			        const bVal = ((b[field] || '') + '').toLowerCase();
			        if (aVal === bVal) return 0;
			        return aVal < bVal ? -1 * direction : 1 * direction;
			      });
			    }
			    
			    const total = postsToRender.length;
		    totalPostsPages = total === 0 ? 1 : Math.ceil(total / POSTS_PER_PAGE);
		    if (currentPostsPage > totalPostsPages) {
		      currentPostsPage = totalPostsPages;
		    }
		    if (currentPostsPage < 1) {
		      currentPostsPage = 1;
		    }
			    const start = (currentPostsPage - 1) * POSTS_PER_PAGE;
			    const end = start + POSTS_PER_PAGE;
			    const pagedPosts = postsToRender.slice(start, end);
			    renderPosts(pagedPosts);
			    renderPostsPagination(total, currentPostsPage, totalPostsPages);
			  };

			  const setPostsSort = (field) => {
			    if (field !== 'title' && field !== 'category' && field !== 'created_at') return;
			    if (currentPostsSortField === field) {
			      currentPostsSortDirection = currentPostsSortDirection === 'asc' ? 'desc' : 'asc';
			    } else {
			      currentPostsSortField = field;
			      currentPostsSortDirection = 'asc';
			    }
			    // Jump back to first page when changing sort, so results are predictable.
			    currentPostsPage = 1;
			    applyPostFiltersAndRender();
			  };

				  const setAuthenticatedUI = (isAuthed) => {
				    const path = window.location.pathname || '';
				    const isHomePage = path.endsWith('index.html') || path === '/' || path === '';
				    const isAdminPage =
				      path.endsWith('admin.html') ||
				      path.endsWith('/admin') ||
				      path.endsWith('/admin/');
				    const isBlogPage =
				      path.endsWith('blog.html') ||
				      path.endsWith('/blog') ||
				      path.endsWith('/blog/');
			    const blogSection = select('#blog');
			    const appSection = select('#blog-app');
			    const userLabel = select('#blog-current-user');
		    const headerUser = select('#auth-user');
		    const headerAvatar = select('#auth-avatar');
		    const headerAvatarImg = select('#auth-avatar-img');
		    const headerAvatarInitial = select('#auth-avatar-initial');
		    const headerAvatarToggle = select('#auth-avatar-toggle');
			    const headerLoginBtn = select('#auth-login-btn');
			    const headerSignupBtn = select('#auth-signup-btn');
			    const headerLogoutBtn = select('#auth-logout-btn');
			    const headerGoBlogBtn = select('#auth-go-blog-btn');
			    const adminPageBtn = select('#btn-open-admin-page');
				    const createPostForm = select('#create-post-form');
				    const adminPanel = select('#admin-panel');
				    const createPostToggleBtn = select('#btn-toggle-create-post');
				    const adminPanelToggleBtn = select('#btn-toggle-admin-panel');
				
				    if (isAuthed) {
			      // Keep the homepage clean: never show the Blog section on the homepage,
			      // even when a user is logged in. The dedicated blog.html page will
			      // continue to show the blog for authenticated users.
			      if (!isHomePage && blogSection) {
			        blogSection.classList.remove('d-none');
			      }
				      if (!isHomePage && appSection) {
				        appSection.classList.remove('d-none');
				      }
			      if (userLabel) {
			        userLabel.textContent = '';
			        if (isBlogPage && currentUser) {
			          const before = 'Good to have you here, ';
			          const sentenceBreak = '. ';
			          const secondLine = "My writings are not conclusions. They’re conversations waiting to happen.";
			          const usernameSpan = document.createElement('span');
			          usernameSpan.className = 'fw-bold text-warning';
			          usernameSpan.textContent = currentUser.username || '';
			          const br = document.createElement('br');
			          userLabel.append(
			            document.createTextNode(before),
			            usernameSpan,
			            document.createTextNode(sentenceBreak),
			            br,
			            document.createTextNode(secondLine)
			          );
			        }
			      }
				      if (headerUser && currentUser) {
				        headerUser.textContent = currentUser.username;
				        headerUser.classList.remove('d-none');
				      }
		      // Show avatar: Google profile photo when available, otherwise a
		      // placeholder initial based on the username.
		      if (headerAvatar && headerAvatarImg && headerAvatarInitial && currentUser) {
		        const avatarUrl = currentUser.avatarUrl;
		        headerAvatar.classList.remove('d-none');
		        if (avatarUrl) {
		          headerAvatarImg.src = avatarUrl;
		          headerAvatarImg.classList.remove('d-none');
		          headerAvatarInitial.textContent = '';
		          headerAvatarInitial.classList.add('d-none');
		        } else {
		          headerAvatarImg.src = '';
		          headerAvatarImg.classList.add('d-none');
		          const initial = (currentUser.username || '').trim().charAt(0) || '?';
		          headerAvatarInitial.textContent = initial.toUpperCase();
		          headerAvatarInitial.classList.remove('d-none');
		        }
		      }
		      if (headerAvatarToggle) headerAvatarToggle.classList.remove('d-none');
					      if (headerLoginBtn) headerLoginBtn.classList.add('d-none');
					      if (headerSignupBtn) headerSignupBtn.classList.add('d-none');
					      if (headerLogoutBtn) headerLogoutBtn.classList.remove('d-none');
					      const isAdmin = currentUser && currentUser.role === 'admin';
					      const isEditor = currentUser && currentUser.role === 'editor';
					      if (headerGoBlogBtn) {
				        if (isHomePage) {
				          headerGoBlogBtn.classList.remove('d-none');
				        } else {
				          headerGoBlogBtn.classList.add('d-none');
				        }
				      }
				      if (adminPageBtn) {
				        if (!currentUser) {
				          adminPageBtn.classList.add('d-none');
				        } else if (isAdminPage) {
				          // When already on the admin/editor page, offer a way back to the blog.
				          adminPageBtn.classList.remove('d-none');
				          const label = 'Blog';
				          const labelSpan = adminPageBtn.querySelector('span');
				          if (labelSpan) labelSpan.textContent = label;
				          adminPageBtn.setAttribute('aria-label', label);
				        } else if (isAdmin || isEditor) {
				          // On non-admin pages, show entry to the admin/editor portal.
				          adminPageBtn.classList.remove('d-none');
				          const label = isAdmin ? 'Admin panel' : "Editor's portal";
				          const labelSpan = adminPageBtn.querySelector('span');
				          if (labelSpan) labelSpan.textContent = label;
				          adminPageBtn.setAttribute('aria-label', label);
				        } else {
				          adminPageBtn.classList.add('d-none');
				        }
				      }
					      if (createPostToggleBtn) {
					        if (currentUser && (isAdmin || isEditor)) {
					          createPostToggleBtn.classList.remove('d-none');
					          createPostToggleBtn.textContent = 'Create a post';
					        } else {
					          createPostToggleBtn.classList.add('d-none');
					        }
					      }
					      if (adminPanelToggleBtn) {
					        if (currentUser && isAdmin) {
					          adminPanelToggleBtn.classList.remove('d-none');
					          adminPanelToggleBtn.textContent = 'Manage users';
					        } else {
					          adminPanelToggleBtn.classList.add('d-none');
					        }
					      }
					      if (createPostForm) {
					        if (!currentUser || (!isAdmin && !isEditor)) {
					          createPostForm.classList.add('d-none');
					        }
					      }
					      if (adminPanel) {
					        if (!currentUser || !isAdmin) {
					          adminPanel.classList.add('d-none');
					        }
					      }
					      // Update admin page title and heading based on role when on the
					      // dedicated admin page. Admins see "Admin panel"; editors see
					      // "Editor's portal".
					      if (isAdminPage && (isAdmin || isEditor)) {
					        const pageHeading = select('#admin-page-title');
					        if (pageHeading) {
					          pageHeading.textContent = isAdmin ? 'Admin panel' : "Editor's portal";
					        }
					        if (isAdmin) {
					          document.title = 'Blog Admin - DMohan';
					        } else if (isEditor) {
					          document.title = "Editor's Portal - DMohan";
					        }
					      }
			    } else {
			      if (blogSection) {
			        blogSection.classList.add('d-none');
			      }
			      if (appSection) {
			        appSection.classList.add('d-none');
			      }
			      if (userLabel) {
			        userLabel.textContent = '';
			      }
		      if (headerUser) {
				        headerUser.textContent = '';
				        headerUser.classList.add('d-none');
				      }
	      if (headerAvatar && headerAvatarImg && headerAvatarInitial) {
		        headerAvatar.classList.add('d-none');
		        headerAvatarImg.src = '';
		        headerAvatarImg.classList.add('d-none');
		        headerAvatarInitial.textContent = '';
	        headerAvatarInitial.classList.add('d-none');
	      }
	      if (headerAvatarToggle) headerAvatarToggle.classList.add('d-none');
				      if (headerLoginBtn) headerLoginBtn.classList.remove('d-none');
				      if (headerSignupBtn) headerSignupBtn.classList.remove('d-none');
				      if (headerLogoutBtn) headerLogoutBtn.classList.add('d-none');
				      if (headerGoBlogBtn) headerGoBlogBtn.classList.add('d-none');
				      if (adminPageBtn) adminPageBtn.classList.add('d-none');
				      if (createPostForm) {
				        createPostForm.classList.add('d-none');
				      }
				      if (adminPanel) {
				        adminPanel.classList.add('d-none');
				      }
				      if (createPostToggleBtn) {
				        createPostToggleBtn.classList.add('d-none');
				      }
				      if (adminPanelToggleBtn) {
				        adminPanelToggleBtn.classList.add('d-none');
				      }
			    }
			  };

	  const apiRequest = async (path, options = {}) => {
	    const url = `${API_BASE_URL}${path}`;
	    const finalOptions = Object.assign({
	      method: 'GET',
	      headers: {}
	    }, options);

	    finalOptions.headers = finalOptions.headers || {};
	    if (authToken) {
	      // Server expects raw JWT in Authorization header (no "Bearer " prefix)
	      finalOptions.headers['Authorization'] = authToken;
	    }

	    const response = await fetch(url, finalOptions);
	    let data = null;
	    try {
	      data = await response.json();
	    } catch (e) {
	      // Ignore JSON parse errors for empty bodies
	    }

	    if (!response.ok) {
	      const msg = (data && (data.message || data.error)) || `Request failed with status ${response.status}`;
	      const err = new Error(msg);
	      err.status = response.status;
	      throw err;
	    }

	    return data;
	  };

	  const handleSignupSubmit = async (event) => {
	    event.preventDefault();
	    const username = select('#signup-username')?.value.trim();
	    const password = select('#signup-password')?.value;
	    if (!username || !password) {
		      showAuthStatus('Please enter both username and password.', 'error');
	      return;
	    }
	    try {
	      await apiRequest('/signup', {
	        method: 'POST',
	        headers: { 'Content-Type': 'application/json' },
	        body: JSON.stringify({ username, password })
	      });
		      showAuthStatus('Account created successfully. You can now log in.', 'success');
	      const form = event.target;
	      if (form && typeof form.reset === 'function') form.reset();
	    } catch (err) {
	      console.error(err);
		      showAuthStatus(err.message || 'Could not create account. Please try again.', 'error');
	    }
	  };

		  const handleLoginSubmit = async (event) => {
		    event.preventDefault();
		    const username = select('#login-username')?.value.trim();
		    const password = select('#login-password')?.value;
		    if (!username || !password) {
		      showAuthStatus('Please enter both username and password.', 'error');
		      return;
		    }
		    try {
		      const data = await apiRequest('/login', {
		        method: 'POST',
		        headers: { 'Content-Type': 'application/json' },
		        body: JSON.stringify({ username, password })
		      });
			      authToken = data.token;
			      currentUser = {
			        id: data.userId,
			        username: data.username,
			        role: data.role || 'user',
			        avatarUrl: null
			      };
		      persistAuth();
		      setAuthenticatedUI(true);
		      showBlogStatus(`Logged in as ${currentUser.username}.`, 'success');
		      hideAuthModal();
		      const form = event.target;
		      if (form && typeof form.reset === 'function') form.reset();
			      // After successful login, navigate to the dedicated blog page
			      const path = window.location.pathname || '';
			      if (!path.endsWith('blog.html')) {
			        window.location.href = 'blog.html';
			      }
		    } catch (err) {
		      console.error(err);
		      showAuthStatus(err.message || 'Could not log in. Please check your credentials.', 'error');
		    }
		  };

		  // Called by Google Identity Services when the user completes a Google
		  // sign-in. The response contains a credential (ID token) that we send to
		  // the backend in exchange for a local JWT that works with the existing
		  // authentication middleware.
		  window.handleGoogleCredentialResponse = async (response) => {
		    try {
		      const idToken = response && response.credential;
		      if (!idToken) {
		        showAuthStatus('Google login failed: missing credential.', 'error');
		        return;
		      }

		      const data = await apiRequest('/login/google', {
		        method: 'POST',
		        headers: { 'Content-Type': 'application/json' },
		        body: JSON.stringify({ idToken })
		      });

		      authToken = data.token;
		      currentUser = {
		        id: data.userId,
		        username: data.username,
		        role: data.role || 'user',
		        avatarUrl: data.avatarUrl || null
		      };
		      persistAuth();
		      setAuthenticatedUI(true);
		      showBlogStatus(`Logged in as ${currentUser.username}.`, 'success');
		      hideAuthModal();
			      const path = window.location.pathname || '';
			      if (!path.endsWith('blog.html')) {
			        window.location.href = 'blog.html';
			      }
		    } catch (err) {
		      console.error(err);
		      showAuthStatus(err.message || 'Could not log in with Google. Please try again.', 'error');
		    }
		  };
		
		  const handleLogoutClick = () => {
		    hideAuthModal();
		    clearAuth();
		    setAuthenticatedUI(false);
		    showBlogStatus('You have been logged out.', 'info');
		    const path = window.location.pathname || '';
		    if (!path.endsWith('index.html')) {
		      window.location.href = 'index.html';
		    }
		  };

								  const renderPosts = (posts) => {
								    const list = select('#posts-list');
								    if (!list) return;
								    list.innerHTML = '';
								    
					    const isModernLayout = currentPostsLayout === 'modern';
								    
								    // Mark the container with the active layout so CSS can adapt.
								    list.classList.toggle('blog-posts-modern', isModernLayout);
								    list.classList.toggle('blog-posts-card', !isModernLayout);
							    	    
					    const path = window.location.pathname || '';
					    const isAdminPage =
					      path.endsWith('admin.html') ||
					      path.endsWith('/admin') ||
					      path.endsWith('/admin/');
					    const isAdmin = isAdminPage && currentUser && currentUser.role === 'admin';
					    const isEditor = isAdminPage && currentUser && currentUser.role === 'editor';
								    const MAX_PREVIEW_LENGTH = 260;
				
		    if (!posts || posts.length === 0) {
		      const empty = document.createElement('p');
		      empty.className = 'text-muted mb-0';
				      const hasSearch = (currentPostsSearchQuery || '').trim().length > 0;
				      if (hasSearch && activeCategoryFilter) {
				        empty.textContent = 'No posts match your search in this category.';
				      } else if (hasSearch) {
				        empty.textContent = 'No posts match your search.';
				      } else if (activeCategoryFilter) {
				        empty.textContent = 'No posts in this category yet.';
				      } else {
				        empty.textContent = 'No posts yet. Create your first post above.';
				      }
		      list.appendChild(empty);
		      return;
		    }
		
						    // Card / modern layout: rich preview with reactions and actions.
								    posts.forEach((post) => {
				      const item = document.createElement('div');
				      item.className = isModernLayout
				        ? 'blog-post-item blog-post-item-modern'
				        : 'list-group-item blog-post-item';
		      item.dataset.postId = post.id;
		      item.dataset.title = post.title || '';
		      item.dataset.description = post.description || '';
		      item.dataset.category = post.category || '';
		      item.dataset.body = post.content || '';
		      item.dataset.status = post.status || '';
		      item.dataset.created = post.created_at || '';

				      const rawCoverKey = (post.cover_image_key || '').toString().trim();
				      if (rawCoverKey) {
				        item.dataset.coverKey = rawCoverKey;
				      }
				
				      if (isModernLayout) {
				        const coverUrl = resolvePostCoverUrl(rawCoverKey);
				        if (coverUrl) {
				          const coverWrapper = document.createElement('div');
				          coverWrapper.className = 'blog-post-cover-wrapper';
				          const coverImg = document.createElement('img');
				          coverImg.className = 'blog-post-cover';
				          coverImg.src = coverUrl;
				          coverImg.alt = post.title
				            ? `Cover for "${post.title}"`
				            : 'Blog post cover image';
				          coverWrapper.appendChild(coverImg);
				          item.appendChild(coverWrapper);
				        }
				      }

				      const header = document.createElement('div');
		      header.className = 'd-flex justify-content-between align-items-start mb-1';
		
		      const titleWrapper = document.createElement('div');
		      const title = document.createElement('h5');
		      title.className = 'mb-0 blog-post-title';
		      title.textContent = post.title;
		      titleWrapper.appendChild(title);
		
			      const meta = document.createElement('small');
			      meta.className = 'text-muted';
			      meta.classList.add('blog-post-meta-date');
			      let dateText = '';
			      if (post.created_at) {
			        const created = new Date(post.created_at);
			        if (!Number.isNaN(created.getTime())) {
			          dateText = formatPrettyDate(created);
			        }
			      }
			      let metaText = dateText;
			      if (isModernLayout && post.category) {
			        const displayCategory = post.category === 'Other' ? 'Others' : post.category;
			        metaText = dateText ? `${dateText}  b ${displayCategory}` : displayCategory;
			      }
			      meta.textContent = metaText;
			
			      const metaWrapper = document.createElement('div');
				        metaWrapper.className = 'd-flex align-items-center gap-2';
			      if (post.category && !isModernLayout) {
				          const categoryBadge = document.createElement('span');
				          categoryBadge.className = 'badge bg-secondary';
				          const displayCategory = post.category === 'Other' ? 'Others' : post.category;
				          categoryBadge.textContent = displayCategory;
				          metaWrapper.appendChild(categoryBadge);
				        }
					      if ((isAdmin || isEditor) && post.status === 'draft') {
				          const draftBadge = document.createElement('span');
				          draftBadge.className = 'badge bg-warning text-dark';
				          draftBadge.textContent = 'Draft';
				          metaWrapper.appendChild(draftBadge);
				        }
				        if (!isModernLayout) {
				          metaWrapper.appendChild(meta);
				        }
		
				      header.appendChild(titleWrapper);
				      header.appendChild(metaWrapper);
		
		      item.appendChild(header);
		
			      // Only show the short description in the classic card layout.
			      // Modern layout cards stay cleaner with just title + meta.
			      if (post.description && !isModernLayout) {
			        const descriptionEl = document.createElement('p');
			        descriptionEl.className = 'mb-1 text-muted small';
			        descriptionEl.textContent = post.description;
			        item.appendChild(descriptionEl);
			      }
					
				      // We no longer render the body content snippet in the cards layout.
				      // Full post content is available via the centered reader view and
				      // the admin edit form.
		
					      // Footer row: reactions on the left (card layout only), expand icon
					      // or date on the right.
					      const footer = document.createElement('div');
					      footer.className = 'd-flex align-items-center justify-content-between mt-1 blog-post-footer';
									
					      if (!isModernLayout) {
					        // Reactions: like/dislike controls and counters, available to all
					        // authenticated users (the page itself is already gated by auth).
					        const reactions = document.createElement('div');
					        reactions.className = 'd-flex align-items-center blog-reactions';
					        reactions.dataset.postId = String(post.id);
									
					        const likeBtn = document.createElement('button');
					        likeBtn.type = 'button';
					        likeBtn.className = 'btn btn-sm btn-outline-success blog-like-btn blog-reaction-btn';
					        likeBtn.setAttribute('aria-label', 'Like post');
					        const likeIcon = document.createElement('span');
					        likeIcon.className = 'blog-reaction-icon';
					        likeIcon.textContent = '👍';
					        const likeCount = document.createElement('span');
					        likeCount.className = 'blog-like-count';
					        likeCount.textContent = String(post.likes_count || 0);
					        likeBtn.appendChild(likeIcon);
					        likeBtn.appendChild(likeCount);
									
					        const dislikeBtn = document.createElement('button');
					        dislikeBtn.type = 'button';
					        dislikeBtn.className = 'btn btn-sm btn-outline-danger blog-dislike-btn blog-reaction-btn';
					        dislikeBtn.setAttribute('aria-label', 'Dislike post');
					        const dislikeIcon = document.createElement('span');
					        dislikeIcon.className = 'blog-reaction-icon';
					        dislikeIcon.textContent = '👎';
					        const dislikeCount = document.createElement('span');
					        dislikeCount.className = 'blog-dislike-count';
					        dislikeCount.textContent = String(post.dislikes_count || 0);
					        dislikeBtn.appendChild(dislikeIcon);
					        dislikeBtn.appendChild(dislikeCount);
									
					        reactions.appendChild(likeBtn);
					        reactions.appendChild(dislikeBtn);
					        footer.appendChild(reactions);
					      }
				
					      if (
					        (isAdmin && currentUser) ||
					        (isEditor && currentUser && post.author_id === currentUser.id)
					      ) {
		        const actions = document.createElement('div');
		        actions.className = 'd-flex justify-content-end gap-2';
							
		        const editBtn = document.createElement('button');
		        editBtn.type = 'button';
		        editBtn.className = 'btn btn-sm btn-outline-primary blog-edit-post';
		        editBtn.textContent = 'Edit';
							
		        const deleteBtn = document.createElement('button');
		        deleteBtn.type = 'button';
		        deleteBtn.className = 'btn btn-sm btn-outline-danger blog-delete-post';
		        deleteBtn.textContent = 'Delete';
							
		        actions.appendChild(editBtn);
		        actions.appendChild(deleteBtn);
		        item.appendChild(actions);
		      }
					
					      // Footer content varies slightly by layout.
					      if (isModernLayout) {
					        // In modern layout, keep relative date on the left and
					        // category badge on the right within the same row.
					        let dateOnlyText = '';
					        if (post.created_at) {
					          const created = new Date(post.created_at);
					          if (!Number.isNaN(created.getTime())) {
					            dateOnlyText = formatPrettyDate(created);
					          }
					        }
					        meta.textContent = dateOnlyText;
					        meta.classList.add('small');
					
					        // Left side: relative date
					        footer.appendChild(meta);
					
					        // Right side: category badge (if any)
					        if (post.category) {
					          const footerCategory = document.createElement('span');
					          footerCategory.className = 'badge bg-secondary';
					          const displayCategory = post.category === 'Other' ? 'Others' : post.category;
					          footerCategory.textContent = displayCategory;
					          footer.appendChild(footerCategory);
					        }
					      } else {
						        // In card layout, keep a discrete expand button on the right.
						        const openBtn = document.createElement('button');
						        openBtn.type = 'button';
						        openBtn.className = 'btn btn-link btn-sm p-0 blog-open-reader';
						        openBtn.setAttribute('aria-label', 'Expand post');
						        const openIcon = document.createElement('span');
						        openIcon.className = 'arrow blog-open-reader-icon';
						        openBtn.appendChild(openIcon);
						        footer.appendChild(openBtn);
						      }
						      item.appendChild(footer);
					
				      list.appendChild(item);
		    });
		  };
			
			  const renderPostsPagination = (totalPosts, page, totalPages) => {
			    const container = select('#posts-pagination');
			    if (!container) return;
			
			    if (!totalPosts || totalPosts <= POSTS_PER_PAGE) {
			      container.classList.add('d-none');
			      container.innerHTML = '';
			      return;
			    }
			
			    container.classList.remove('d-none');
			
			    const prevDisabled = page <= 1;
			    const nextDisabled = page >= totalPages;
			
			    container.innerHTML = '';
			
			    const prevBtn = document.createElement('button');
			    prevBtn.type = 'button';
			    prevBtn.className = 'btn btn-outline-secondary btn-sm';
			    prevBtn.textContent = 'Previous';
			    prevBtn.dataset.pageAction = 'prev';
			    if (prevDisabled) {
			      prevBtn.disabled = true;
			    }
			
			    const info = document.createElement('span');
			    info.className = 'small text-muted';
			    info.textContent = `Page ${page} of ${totalPages}`;
			
			    const nextBtn = document.createElement('button');
			    nextBtn.type = 'button';
			    nextBtn.className = 'btn btn-outline-secondary btn-sm';
			    nextBtn.textContent = 'Next';
			    nextBtn.dataset.pageAction = 'next';
			    if (nextDisabled) {
			      nextBtn.disabled = true;
			    }
			
			    container.appendChild(prevBtn);
			    container.appendChild(info);
			    container.appendChild(nextBtn);
			  };

		  const renderAdminUsers = (users) => {
		    const tbody = select('#admin-users-body');
		    if (!tbody) return;
		    tbody.innerHTML = '';

		    if (!Array.isArray(users) || users.length === 0) {
		      const row = document.createElement('tr');
		      const cell = document.createElement('td');
		      cell.colSpan = 3;
		      cell.className = 'text-muted small';
		      cell.textContent = 'No users found.';
		      row.appendChild(cell);
		      tbody.appendChild(row);
		      return;
		    }

		    users.forEach((user) => {
		      const row = document.createElement('tr');
		      const nameCell = document.createElement('td');
		      const roleCell = document.createElement('td');
		      const actionsCell = document.createElement('td');
		      actionsCell.className = 'text-end';

		      const isCurrent = currentUser && user.id === currentUser.id;
		      const youLabel = isCurrent ? ' (you)' : '';
		      nameCell.textContent = `${user.username}${youLabel}`;
			      if (user.role === 'admin') {
			        roleCell.textContent = 'Admin';
			      } else if (user.role === 'editor') {
			        roleCell.textContent = 'Editor';
			      } else {
			        roleCell.textContent = 'User';
			      }
			
			      // Allow admins to change roles between admin, editor, and user.
			      const makeAdminBtn = document.createElement('button');
			      makeAdminBtn.type = 'button';
			      makeAdminBtn.className = 'btn btn-sm btn-outline-secondary me-1 admin-role-toggle';
			      makeAdminBtn.dataset.userId = String(user.id);
			      makeAdminBtn.dataset.targetRole = 'admin';
			      makeAdminBtn.textContent = 'Make admin';
			
			      const makeEditorBtn = document.createElement('button');
			      makeEditorBtn.type = 'button';
			      makeEditorBtn.className = 'btn btn-sm btn-outline-secondary me-1 admin-role-toggle';
			      makeEditorBtn.dataset.userId = String(user.id);
			      makeEditorBtn.dataset.targetRole = 'editor';
			      makeEditorBtn.textContent = 'Make editor';
			
			      const makeUserBtn = document.createElement('button');
			      makeUserBtn.type = 'button';
			      makeUserBtn.className = 'btn btn-sm btn-outline-secondary admin-role-toggle';
			      makeUserBtn.dataset.userId = String(user.id);
			      makeUserBtn.dataset.targetRole = 'user';
			      makeUserBtn.textContent = 'Make reader';
			
			      actionsCell.appendChild(makeAdminBtn);
			      actionsCell.appendChild(makeEditorBtn);
			      actionsCell.appendChild(makeUserBtn);
		      row.appendChild(nameCell);
		      row.appendChild(roleCell);
		      row.appendChild(actionsCell);
		      tbody.appendChild(row);
		    });
		  };
				
				  const renderAdminPosts = () => {
				    const tbody = select('#admin-posts-body');
				    if (!tbody) return;
				
				    tbody.innerHTML = '';
				
				    if (!Array.isArray(allPosts) || allPosts.length === 0) {
				      const row = document.createElement('tr');
				      const cell = document.createElement('td');
				      cell.colSpan = 8;
				      cell.className = 'text-muted small';
				      cell.textContent = 'No posts found.';
				      row.appendChild(cell);
				      tbody.appendChild(row);
				      return;
				    }
				
				    const getUserDisplayName = (userId) => {
				      if (!userId) return '';
				      const name = adminUsersById[userId];
				      if (name) return name;
				      return `User #${userId}`;
				    };
				
				    const formatDateTime = (value) => {
				      if (!value) return '';
				      const date = new Date(value);
				      if (Number.isNaN(date.getTime())) return '';
				      return date.toLocaleString();
				    };
				
				    allPosts.forEach((post) => {
				      const row = document.createElement('tr');
				
				      const titleCell = document.createElement('td');
				      titleCell.textContent = post.title || '(untitled)';
				
				      const likesCell = document.createElement('td');
				      const likesCount = typeof post.likes_count === 'number' ? post.likes_count : 0;
				      likesCell.className = 'text-center';
				      likesCell.textContent = String(likesCount);
				
				      const dislikesCell = document.createElement('td');
				      const dislikesCount = typeof post.dislikes_count === 'number' ? post.dislikes_count : 0;
				      dislikesCell.className = 'text-center';
				      dislikesCell.textContent = String(dislikesCount);
				
				      const totalReactions = likesCount + dislikesCount;
				      const likePercentageCell = document.createElement('td');
				      likePercentageCell.className = 'text-center';
				      if (totalReactions > 0) {
				        const pct = Math.round((likesCount / totalReactions) * 100);
				        likePercentageCell.textContent = `${pct}%`;
				      } else {
				        likePercentageCell.textContent = '0%';
				      }
				
				      const createdCell = document.createElement('td');
				      createdCell.textContent = formatDateTime(post.created_at);
				
				      const updatedCell = document.createElement('td');
				      updatedCell.textContent = formatDateTime(post.updated_at);
				
				      const createdByCell = document.createElement('td');
				      const authorId =
				        typeof post.author_id === 'number' || typeof post.author_id === 'string'
				          ? Number(post.author_id)
				          : undefined;
				      createdByCell.textContent = authorId ? getUserDisplayName(authorId) : '';
				
				      const updatedByCell = document.createElement('td');
				      // Currently we do not track a separate last editor on the
				      // backend, so we display the original author here. This can be
				      // extended later with a dedicated "last_editor_id" field.
				      updatedByCell.textContent = createdByCell.textContent;
				
				      row.appendChild(titleCell);
				      row.appendChild(likesCell);
				      row.appendChild(dislikesCell);
				      row.appendChild(likePercentageCell);
				      row.appendChild(createdCell);
				      row.appendChild(updatedCell);
				      row.appendChild(createdByCell);
				      row.appendChild(updatedByCell);
				
				      tbody.appendChild(row);
				    });
				  };

		  const loadPosts = async () => {
		    if (!authToken) {
		      setAuthenticatedUI(false);
		      return;
		    }
		    try {
			      const posts = await apiRequest('/posts', {
			        method: 'GET'
			      });
			      let normalized = Array.isArray(posts) ? posts : [];
					      const path = window.location.pathname || '';
					      const isBlogPage =
					        path.endsWith('blog.html') ||
					        path.endsWith('/blog') ||
					        path.endsWith('/blog/');
					      const isAdmin = currentUser && currentUser.role === 'admin';
					      const isEditor = currentUser && currentUser.role === 'editor';
					      // On the main blog reader page, admins and editors should see the same
					      // published posts that normal readers do. Drafts remain visible only
					      // on the dedicated admin page.
					      if (isBlogPage && (isAdmin || isEditor)) {
			        normalized = normalized.filter((post) => {
			          const status = post.status || '';
			          return status === '' || status === 'published';
			        });
			      }
			      allPosts = normalized;
			      currentPostsPage = 1;
			      applyPostFiltersAndRender();
		    } catch (err) {
		      console.error(err);
		      showBlogStatus(err.message || 'Could not load posts.', 'error');
		    }
		  };

		  const loadAdminUsers = async () => {
		    const adminPanel = select('#admin-panel');
		    if (!adminPanel) return; // Not on the blog page.

		    if (!authToken || !currentUser || currentUser.role !== 'admin') {
		      adminPanel.classList.add('d-none');
		      return;
		    }

		    try {
				      const users = await apiRequest('/users', { method: 'GET' });
				      adminUsersById = {};
					      if (Array.isArray(users)) {
					        users.forEach((user) => {
					          if (!user || typeof user.id === 'undefined') return;
					          const numericId = Number(user.id);
					          if (!Number.isNaN(numericId)) {
					            const raw = user.username || `User #${user.id}`;
					            adminUsersById[numericId] = deriveDisplayNameFromIdentifier(raw) || raw;
					          }
					        });
					      }
				      renderAdminUsers(users);
				      renderAdminPosts();
		    } catch (err) {
		      console.error(err);
		      showAdminUsersStatus(err.message || 'Could not load users.', 'error');
		    }
		  };
			
			  const handlePostsPaginationClick = (event) => {
			    const target = event.target;
			    if (!(target instanceof HTMLElement)) return;
			    const action = target.dataset.pageAction;
			    if (!action) return;
			
			    event.preventDefault();
			
			    if (action === 'prev' && currentPostsPage > 1) {
			      currentPostsPage -= 1;
			      applyPostFiltersAndRender();
			    } else if (action === 'next' && currentPostsPage < totalPostsPages) {
			      currentPostsPage += 1;
			      applyPostFiltersAndRender();
			    }
			  };

				  const handleCreatePostSubmit = async (event) => {
			    event.preventDefault();
					    if (
					      !authToken ||
					      !currentUser ||
					      (currentUser.role !== 'admin' && currentUser.role !== 'editor')
					    ) {
					      showBlogStatus('Only admins and editors can create posts.', 'error');
					      return;
					    }
				    const titleInput = select('#post-title');
				    const descriptionInput = select('#post-description');
				    const categoryInput = select('#post-category');
				    const bodyInput = select('#post-body');
				    const coverSelect = select('#post-cover-key');
				    const title = titleInput?.value.trim();
				    const description = descriptionInput?.value.trim() || '';
				    const category = categoryInput?.value.trim() || '';
				    const coverImageKey = coverSelect && typeof coverSelect.value === 'string'
				      ? coverSelect.value.trim()
				      : '';
				    const body = bodyInput?.value.trim();
		    if (!title || !body) {
		      showBlogStatus('Please provide at least a title and body.', 'error');
		      return;
		    }

		    const isEditing = !!editingPostId;
		    const path = isEditing ? `/posts/${editingPostId}` : '/posts';
		    const method = isEditing ? 'PUT' : 'POST';
		    const submitter = event.submitter;
		    let status = 'published';
		    if (submitter && submitter.dataset && submitter.dataset.status === 'draft') {
		      status = 'draft';
		    }
		    const successMessage = isEditing
		      ? (status === 'draft' ? 'Draft updated successfully.' : 'Post published successfully.')
		      : (status === 'draft' ? 'Draft saved successfully.' : 'Post published successfully.');

		    try {
		      await apiRequest(path, {
		        method,
		        headers: { 'Content-Type': 'application/json' },
				        body: JSON.stringify({ title, description, category, cover_image_key: coverImageKey, content: body, status })
		      });
		      showBlogStatus(successMessage, 'success');
		      if (event.target && typeof event.target.reset === 'function') {
		        event.target.reset();
		      }
		
		      // After creating or editing a post, reset the form state and bring the posts back into view.
		      editingPostId = null;
		      const formEl = select('#create-post-form');
		      const submitBtn = formEl ? formEl.querySelector('button[type="submit"]') : null;
		      const adminPanel = select('#admin-panel');
		      const blogApp = select('#blog-app');
		      const postsList = select('#posts-list');
		      const toggleBtn = select('#btn-toggle-create-post');
		
		      if (submitBtn) {
		        submitBtn.textContent = 'Publish post';
		      }
		      if (formEl) formEl.classList.add('d-none');
		      if (toggleBtn) toggleBtn.textContent = 'Create a post';
		      if (adminPanel && blogApp) {
		        // On the dedicated blog page, show the posts container again.
		        blogApp.classList.remove('d-none');
		      } else if (postsList) {
		        // On the homepage section, show the posts list again.
		        postsList.classList.remove('d-none');
		      }
		
		      await loadPosts();
		    } catch (err) {
		      console.error(err);
		      showBlogStatus(
		        err.message || (isEditing ? 'Could not update post.' : 'Could not create post.'),
		        'error'
		      );
		    }
		  };
		
				  const handleToggleCreatePostClick = () => {
			    if (
			      !authToken ||
			      !currentUser ||
			      (currentUser.role !== 'admin' && currentUser.role !== 'editor')
			    ) {
			      showBlogStatus('Only admins and editors can create posts.', 'error');
			      return;
			    }
				    const createPostForm = select('#create-post-form');
		    if (!createPostForm) return;
		    const adminPanel = select('#admin-panel');
		    const blogApp = select('#blog-app');
		    const postsList = select('#posts-list');
		    const adminPanelToggleBtn = select('#btn-toggle-admin-panel');
		    const submitBtn = createPostForm.querySelector('button[type="submit"]');
		
		    const isHidden = createPostForm.classList.contains('d-none');
		    const btn = select('#btn-toggle-create-post');
		
				    if (isHidden) {
		      // Enter "create" mode explicitly: clear any edit state, reset fields, show form, hide posts.
		      editingPostId = null;
		      if (submitBtn) submitBtn.textContent = 'Publish post';
		      const titleInput = select('#post-title');
		      const descriptionInput = select('#post-description');
		      const categoryInput = select('#post-category');
		      const bodyInput = select('#post-body');
				      const coverSelect = select('#post-cover-key');
		      if (titleInput) titleInput.value = '';
		      if (descriptionInput) descriptionInput.value = '';
		      if (categoryInput) categoryInput.value = '';
		      if (bodyInput) bodyInput.value = '';
				      if (coverSelect) coverSelect.value = '';
		
		      createPostForm.classList.remove('d-none');
		      if (btn) btn.textContent = 'Hide create form';
		      if (adminPanel) {
		        adminPanel.classList.add('d-none');
		        if (adminPanelToggleBtn) adminPanelToggleBtn.textContent = 'Manage users';
		        if (blogApp) blogApp.classList.add('d-none');
		      } else if (postsList) {
		        // On the homepage, only hide the posts list.
		        postsList.classList.add('d-none');
		      }
		    } else {
		      // Leave create/edit mode: hide form, reset edit state, and show posts again.
		      editingPostId = null;
		      if (submitBtn) submitBtn.textContent = 'Publish post';
		      createPostForm.classList.add('d-none');
		      if (btn) btn.textContent = 'Create a post';
		      if (adminPanel) {
		        // Dedicated blog page.
		        if (blogApp) blogApp.classList.remove('d-none');
		      } else if (postsList) {
		        // Homepage blog section.
		        postsList.classList.remove('d-none');
		      }
		    }
		  };
		
				  const handleToggleAdminPanelClick = () => {
		    if (!authToken || !currentUser || currentUser.role !== 'admin') {
		      showBlogStatus('Only admins can manage users.', 'error');
		      return;
		    }
		    const adminPanel = select('#admin-panel');
		    if (!adminPanel) return;
			    const blogApp = select('#blog-app');
			    const createPostForm = select('#create-post-form');
			    const createPostToggleBtn = select('#btn-toggle-create-post');
			    const analysisPanel = select('#analysis-panel');
			    const analysisToggleBtn = select('#btn-toggle-analysis-panel');
		
		    const isHidden = adminPanel.classList.contains('d-none');
		    const btn = select('#btn-toggle-admin-panel');
		
		    if (isHidden) {
		      // Enter "manage users" mode: show panel, hide posts and any open create/edit form.
		      adminPanel.classList.remove('d-none');
		      if (btn) btn.textContent = 'Hide user list';
		      if (blogApp) blogApp.classList.add('d-none');
		      if (createPostForm) {
		        createPostForm.classList.add('d-none');
		        const submitBtn = createPostForm.querySelector('button[type="submit"]');
		        if (submitBtn) submitBtn.textContent = 'Publish post';
		        editingPostId = null;
		        if (createPostToggleBtn) createPostToggleBtn.textContent = 'Create a post';
		      }
			      if (analysisPanel) {
			        analysisPanel.classList.add('d-none');
			        if (analysisToggleBtn) analysisToggleBtn.textContent = 'Blog analysis';
			      }
		      loadAdminUsers();
		    } else {
		      // Leave "manage users" mode: hide panel and show posts again.
		      adminPanel.classList.add('d-none');
		      if (btn) btn.textContent = 'Manage users';
		      if (blogApp) blogApp.classList.remove('d-none');
		    }
		  };

			  const handleToggleAnalysisPanelClick = () => {
			    if (!authToken || !currentUser || currentUser.role !== 'admin') {
			      showBlogStatus('Only admins can view blog analysis.', 'error');
			      return;
			    }
			    const analysisPanel = select('#analysis-panel');
			    if (!analysisPanel) return;
			    const blogApp = select('#blog-app');
			    const createPostForm = select('#create-post-form');
			    const adminPanel = select('#admin-panel');
			    const createPostToggleBtn = select('#btn-toggle-create-post');
			    const adminPanelToggleBtn = select('#btn-toggle-admin-panel');
			
			    const isHidden = analysisPanel.classList.contains('d-none');
			    const btn = select('#btn-toggle-analysis-panel');
			
			    if (isHidden) {
			      // Enter "blog analysis" mode: show overview, hide posts and other admin panels.
			      analysisPanel.classList.remove('d-none');
			      if (btn) btn.textContent = 'Hide analysis';
			      if (blogApp) blogApp.classList.add('d-none');
			      if (createPostForm) {
			        createPostForm.classList.add('d-none');
			        const submitBtn = createPostForm.querySelector('button[type="submit"]');
			        if (submitBtn) submitBtn.textContent = 'Publish post';
			        editingPostId = null;
			        if (createPostToggleBtn) createPostToggleBtn.textContent = 'Create a post';
			      }
			      if (adminPanel) {
			        adminPanel.classList.add('d-none');
			        if (adminPanelToggleBtn) adminPanelToggleBtn.textContent = 'Manage users';
			      }
			      // Ensure we have up-to-date user map and analytics data.
			      loadAdminUsers();
			    } else {
			      // Leave analysis mode: hide panel and show posts again.
			      analysisPanel.classList.add('d-none');
			      if (btn) btn.textContent = 'Blog analysis';
			      if (blogApp) blogApp.classList.remove('d-none');
			    }
			  };

								  const handlePostListClick = async (event) => {
						    	const target = event.target;
						    	if (!(target instanceof HTMLElement)) return;
												
						    	const readerTrigger = target.closest('.blog-toggle-body, .blog-open-reader');
		    	if (readerTrigger instanceof HTMLElement) {
		      	const item = readerTrigger.closest('.blog-post-item');
		      	if (!item) return;
		      	openPostInReader(item);
		      	return;
		    	}
					
				    // Reactions (like/dislike) are available to any authenticated user.
				    const reactionBtn = target.closest('.blog-like-btn, .blog-dislike-btn');
				    if (reactionBtn instanceof HTMLElement) {
				      // Prevent navigation (e.g., if cards are wrapped in links on index.html)
				      // and stop the event from bubbling to outer click handlers.
				      event.preventDefault();
				      event.stopPropagation();
				      await handleReactionClick(reactionBtn);
				      return;
				    }
						
				    const isModernLayout = currentPostsLayout === 'modern';
				    if (isModernLayout) {
				      const modernItem = target.closest('.blog-post-item-modern');
				      if (modernItem instanceof HTMLElement) {
				        // Do not intercept clicks on reaction buttons or admin controls.
				        if (
				          target.closest('.blog-reactions') ||
				          target.classList.contains('blog-edit-post') ||
				          target.classList.contains('blog-delete-post')
				        ) {
				          // Let the dedicated handlers above/below deal with these.
				        } else {
				          openPostInReader(modernItem);
				          return;
				        }
				      }
				    }
						
					    // Only admins and editors are allowed to edit or delete posts. The server
				    // enforces this as well, but we short-circuit here for the UI.
				    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'editor')) return;
				    const item = target.closest('.blog-post-item');
				    if (!item) return;
				    const postId = item.dataset.postId;
				    if (!postId) return;
					
				    if (target.classList.contains('blog-delete-post')) {
		      if (!window.confirm('Are you sure you want to delete this post?')) return;
		      try {
		        await apiRequest(`/posts/${postId}`, { method: 'DELETE' });
		        showBlogStatus('Post deleted successfully.', 'success');
		        await loadPosts();
		      } catch (err) {
		        console.error(err);
		        showBlogStatus(err.message || 'Could not delete post.', 'error');
		      }
				    } else if (target.classList.contains('blog-edit-post')) {
				      const titleEl = item.querySelector('.blog-post-title');
				      const contentEl = item.querySelector('.blog-post-content');
				      const currentTitle = item.dataset.title || (titleEl ? titleEl.textContent || '' : '');
				      const currentDescription = item.dataset.description || '';
				      const currentCategory = item.dataset.category || '';
				      const currentBody =
				        item.dataset.body || (contentEl ? contentEl.dataset.full || contentEl.textContent || '' : '');
				      const currentCoverKey = item.dataset.coverKey || '';
						
				      const createPostForm = select('#create-post-form');
				      const titleInput = select('#post-title');
				      const descriptionInput = select('#post-description');
				      const categoryInput = select('#post-category');
				      const bodyInput = select('#post-body');
				      const coverSelect = select('#post-cover-key');
				      if (!createPostForm || !titleInput || !descriptionInput || !categoryInput || !bodyInput) return;
						
				      // Put the form into "edit" mode.
				      editingPostId = postId;
				      titleInput.value = currentTitle;
				      descriptionInput.value = currentDescription;
				      categoryInput.value = currentCategory || '';
				      bodyInput.value = currentBody;
				      if (coverSelect) coverSelect.value = currentCoverKey || '';
		
		      const submitBtn = createPostForm.querySelector('button[type="submit"]');
		      if (submitBtn) submitBtn.textContent = 'Save changes';
		
		      // Show the form and hide posts, similar to entering create mode.
		      const adminPanel = select('#admin-panel');
		      const blogApp = select('#blog-app');
		      const postsListEl = select('#posts-list');
		      const createToggleBtn = select('#btn-toggle-create-post');
		      const adminPanelToggleBtn = select('#btn-toggle-admin-panel');
		
		      createPostForm.classList.remove('d-none');
		      if (createToggleBtn) {
		        createToggleBtn.classList.remove('d-none');
		        createToggleBtn.textContent = 'Cancel editing';
		      }
		
		      if (adminPanel) {
		        adminPanel.classList.add('d-none');
		        if (adminPanelToggleBtn) adminPanelToggleBtn.textContent = 'Manage users';
		        if (blogApp) blogApp.classList.add('d-none');
		      } else if (postsListEl) {
		        // On the homepage, hide only the posts list.
		        postsListEl.classList.add('d-none');
		      }
		    }
	  };

		  const handleAdminUsersClick = async (event) => {
		    const target = event.target;
		    if (!(target instanceof HTMLElement)) return;
		    if (!target.classList.contains('admin-role-toggle')) return;

		    if (!authToken || !currentUser || currentUser.role !== 'admin') return;

		    const userId = target.dataset.userId;
		    const newRole = target.dataset.targetRole;
		    if (!userId || !newRole) return;

			    let confirmText;
			    if (newRole === 'admin') {
			      confirmText = 'Make this user an admin?';
			    } else if (newRole === 'editor') {
			      confirmText = 'Make this user an editor?';
			    } else {
			      confirmText = 'Make this user a regular reader?';
			    }
		    if (!window.confirm(confirmText)) return;

		    try {
		      await apiRequest(`/users/${userId}/role`, {
		        method: 'PUT',
		        headers: { 'Content-Type': 'application/json' },
		        body: JSON.stringify({ role: newRole })
		      });
		      showAdminUsersStatus('Role updated successfully.', 'success');

		      // If we changed our own role, update the in-memory auth state and UI.
		      if (currentUser && String(currentUser.id) === String(userId)) {
		        currentUser.role = newRole;
		        persistAuth();
		        setAuthenticatedUI(true);
		      }
		      await loadAdminUsers();
		    } catch (err) {
		      console.error(err);
		      showAdminUsersStatus(err.message || 'Could not update role.', 'error');
		    }
		  };

		  const handleCategoryFilterChange = (event) => {
			    const selectEl = event.target;
			    if (!(selectEl instanceof HTMLSelectElement)) return;
			    activeCategoryFilter = selectEl.value || '';
			    currentPostsPage = 1;
			    applyPostFiltersAndRender();
		  };
			  
			  const handleSearchInput = (event) => {
				    const inputEl = event.target;
				    if (!(inputEl instanceof HTMLInputElement)) return;
				    currentPostsSearchQuery = inputEl.value || '';
				    currentPostsPage = 1;
				    applyPostFiltersAndRender();
			  };

									  const updateLayoutToggleUI = () => {
									    const toggleBtn = select('#blog-layout-toggle');
									    if (!toggleBtn || !(toggleBtn instanceof HTMLElement)) return;
									    const isModern = currentPostsLayout === 'modern';
									    toggleBtn.textContent = isModern ? 'Modern' : 'Cards';
									    toggleBtn.setAttribute(
									      'aria-label',
									      isModern ? 'Switch to cards view' : 'Switch to modern view',
									    );
									  };
									  
									  const setPostsLayout = (layout) => {
									    if (layout !== 'card' && layout !== 'modern') return;
			    if (layout === currentPostsLayout) return;
			    currentPostsLayout = layout;
			    updateLayoutToggleUI();
			    applyPostFiltersAndRender();
			  };
			
			  const handleLayoutToggleClick = () => {
			    const nextLayout = currentPostsLayout === 'modern' ? 'card' : 'modern';
			    setPostsLayout(nextLayout);
			  };

			  const initBlogApp = () => {
		    // Only run if the blog section exists on this page
		    if (!select('#blog')) return;
		  
		    loadStoredAuth();
		    ensurePostReader();
					
				    // If this is the dedicated blog or admin page and there is no
		    // valid auth, send the user back to the homepage to sign in.
			    const path = window.location.pathname || '';
			    const isBlogPage =
			      path.endsWith('blog.html') ||
			      path.endsWith('/blog') ||
			      path.endsWith('/blog/');
			    const isAdminPage =
			      path.endsWith('admin.html') ||
			      path.endsWith('/admin') ||
			      path.endsWith('/admin/');
			    if ((!authToken || !currentUser) && (isBlogPage || isAdminPage)) {
		      window.location.href = 'index.html';
		      return;
		    }
			    // If a non-privileged user somehow reaches the admin page, redirect
			    // them back to the normal blog reader. Admins and editors may
			    // remain on the admin page.
			    if (
			      isAdminPage &&
			      currentUser &&
			      currentUser.role !== 'admin' &&
			      currentUser.role !== 'editor'
			    ) {
		      window.location.href = 'blog.html';
		      return;
		    }
		
		    const signupForm = select('#signup-form');
		    const loginForm = select('#login-form');
		    const createPostForm = select('#create-post-form');
		    const logoutBtn = select('#logout-btn');
		    const headerLogoutBtn = select('#auth-logout-btn');
		    const headerGoBlogBtn = select('#auth-go-blog-btn');
		    const postsList = select('#posts-list');
		    const adminUsersBody = select('#admin-users-body');
		    const categoryFilter = select('#blog-category-filter');
		    const layoutToggle = select('#blog-layout-toggle');
				    const searchInput = select('#blog-search');
			    const createPostToggleBtn = select('#btn-toggle-create-post');
			    const adminPanelToggleBtn = select('#btn-toggle-admin-panel');
			    const analysisPanelToggleBtn = select('#btn-toggle-analysis-panel');
			    const postsPagination = select('#posts-pagination');
			    const adminPageBtn = select('#btn-open-admin-page');

		    if (signupForm) {
		      signupForm.addEventListener('submit', handleSignupSubmit);
		    }
		    if (loginForm) {
		      loginForm.addEventListener('submit', handleLoginSubmit);
		    }
		    if (createPostForm) {
		      createPostForm.addEventListener('submit', handleCreatePostSubmit);
		    }
			    if (logoutBtn) {
			      logoutBtn.addEventListener('click', handleLogoutClick);
			    }
				    if (headerLogoutBtn) {
				      headerLogoutBtn.addEventListener('click', handleLogoutClick);
				    }
		    	if (headerGoBlogBtn) {
			      headerGoBlogBtn.addEventListener('click', () => {
			        window.location.href = 'blog.html';
			      });
			    }
			    if (adminPageBtn) {
			      const path = window.location.pathname || '';
			      const isAdminPage =
			        path.endsWith('admin.html') ||
			        path.endsWith('/admin') ||
			        path.endsWith('/admin/');
			      adminPageBtn.addEventListener('click', () => {
			        if (isAdminPage) {
			          window.location.href = 'blog.html';
			        } else {
			          window.location.href = 'admin.html';
			        }
			      });
			    }
			    if (createPostToggleBtn) {
			      createPostToggleBtn.addEventListener('click', handleToggleCreatePostClick);
			    }
			    if (adminPanelToggleBtn) {
			      adminPanelToggleBtn.addEventListener('click', handleToggleAdminPanelClick);
			    }
			    if (analysisPanelToggleBtn) {
			      analysisPanelToggleBtn.addEventListener('click', handleToggleAnalysisPanelClick);
			    }
		    if (postsList) {
		      postsList.addEventListener('click', handlePostListClick);
		    }
			    if (postsPagination) {
			      postsPagination.addEventListener('click', handlePostsPaginationClick);
			    }
			    if (categoryFilter) {
			      categoryFilter.addEventListener('change', handleCategoryFilterChange);
			    }
				    if (searchInput) {
				      searchInput.addEventListener('input', handleSearchInput);
				    }
									    if (layoutToggle) {
									      layoutToggle.addEventListener('click', handleLayoutToggleClick);
									      // Ensure the toggle button text/ARIA reflect the initial layout
									      updateLayoutToggleUI();
									    }
			    if (adminUsersBody) {
			      adminUsersBody.addEventListener('click', handleAdminUsersClick);
			    }
		
			    if (authToken && currentUser) {
			      setAuthenticatedUI(true);
			      loadPosts();
			    } else {
		      setAuthenticatedUI(false);
		    }
		  };

	  window.addEventListener('load', initBlogApp);

})()