const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");

// Ensure data directory exists
const dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, "loop.db"));

// Enable foreign keys
db.pragma("foreign_keys = ON");

// Initialize database tables
function initializeDatabase() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Categories table
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      icon TEXT,
      description TEXT
    )
  `);

  // Posts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      upvotes INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (category_id) REFERENCES categories(id)
    )
  `);

  // Replies table (threaded)
  db.exec(`
    CREATE TABLE IF NOT EXISTS replies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      post_id INTEGER NOT NULL,
      parent_reply_id INTEGER,
      upvotes INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_reply_id) REFERENCES replies(id) ON DELETE CASCADE
    )
  `);

  // Post upvotes tracking
  db.exec(`
    CREATE TABLE IF NOT EXISTS post_upvotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      post_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, post_id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
    )
  `);

  // Reply upvotes tracking
  db.exec(`
    CREATE TABLE IF NOT EXISTS reply_upvotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      reply_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, reply_id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (reply_id) REFERENCES replies(id) ON DELETE CASCADE
    )
  `);

  // Bookmarks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      post_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, post_id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
    )
  `);

  // Follows table (user follows another user)
  db.exec(`
    CREATE TABLE IF NOT EXISTS follows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      follower_id INTEGER NOT NULL,
      following_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(follower_id, following_id),
      FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create indexes for better performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category_id);
    CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id);
    CREATE INDEX IF NOT EXISTS idx_replies_post ON replies(post_id);
    CREATE INDEX IF NOT EXISTS idx_replies_parent ON replies(parent_reply_id);
    CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);
    CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
    CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
  `);

  // Seed initial data
  seedData();
}

function seedData() {
  // Check if categories already exist
  const categoryCount = db
    .prepare("SELECT COUNT(*) as count FROM categories")
    .get();
  if (categoryCount.count > 0) return;

  // Insert categories
  const categories = [
    {
      name: "Travel",
      slug: "travel",
      icon: "🌍",
      description: "Travel tips, destinations, and experiences",
    },
    {
      name: "Technology",
      slug: "technology",
      icon: "💻",
      description: "Tech news, programming, and gadgets",
    },
    {
      name: "Career",
      slug: "career",
      icon: "💼",
      description: "Job advice and professional development",
    },
    {
      name: "Movie",
      slug: "movie",
      icon: "🎬",
      description: "Film discussions, reviews, and recommendations",
    },
    {
      name: "News",
      slug: "news",
      icon: "📰",
      description: "Current events and world news",
    },
    {
      name: "General",
      slug: "general",
      icon: "💬",
      description: "Everything else",
    },
  ];

  const insertCategory = db.prepare(
    "INSERT INTO categories (name, slug, icon, description) VALUES (?, ?, ?, ?)",
  );
  categories.forEach((cat) => {
    insertCategory.run(cat.name, cat.slug, cat.icon, cat.description);
  });

  // Create demo users
  const hashedPassword = bcrypt.hashSync("password123", 10);
  const insertUser = db.prepare(
    "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
  );

  const demoUsers = [
    { username: "traveler_jane", email: "jane@example.com" },
    { username: "tech_guru", email: "techguru@example.com" },
    { username: "movie_buff", email: "moviebuff@example.com" },
    { username: "career_coach", email: "coach@example.com" },
    { username: "news_junkie", email: "newsjunkie@example.com" },
    { username: "adventure_seeker", email: "adventure@example.com" },
    { username: "code_master", email: "codemaster@example.com" },
    { username: "film_critic", email: "filmcritic@example.com" },
  ];

  demoUsers.forEach((user) => {
    insertUser.run(user.username, user.email, hashedPassword);
  });

  // Insert sample posts
  const insertPost = db.prepare(
    "INSERT INTO posts (title, content, user_id, category_id, upvotes) VALUES (?, ?, ?, ?, ?)",
  );
  const insertReply = db.prepare(
    "INSERT INTO replies (content, user_id, post_id, parent_reply_id, upvotes) VALUES (?, ?, ?, ?, ?)",
  );

  // ============ TRAVEL POSTS (15 posts) ============
  const travelPost1 = insertPost.run(
    "Best hidden gems in Southeast Asia?",
    "I'm planning a 3-month trip to Southeast Asia and want to visit places that are off the beaten path. Already been to the popular spots in Thailand and Bali. Looking for local recommendations for Vietnam, Cambodia, and the Philippines. Budget is around $50/day. What are your favorite hidden gems?",
    1,
    1,
    24,
  );
  insertReply.run(
    "Check out Phong Nha in Vietnam - the caves there are absolutely incredible and way less touristy than Ha Long Bay. You can easily spend 3-4 days exploring the area.",
    2,
    travelPost1.lastInsertRowid,
    null,
    15,
  );
  insertReply.run(
    'Siquijor Island in the Philippines is magical! It\'s known as the "Island of Fire" and has beautiful waterfalls, beaches, and a mystical vibe. Very budget-friendly too.',
    3,
    travelPost1.lastInsertRowid,
    null,
    12,
  );

  const travelPost2 = insertPost.run(
    "Solo female travel safety tips",
    "First time solo traveling as a woman, heading to Europe for a month. Would love to hear safety tips and must-know advice from experienced solo female travelers. I'll be visiting Paris, Barcelona, Rome, and Amsterdam.",
    3,
    1,
    45,
  );
  insertReply.run(
    "Trust your instincts! If something feels off, remove yourself from the situation. Also, I always share my location with family and check in daily.",
    1,
    travelPost2.lastInsertRowid,
    null,
    22,
  );

  insertPost.run(
    "Budget backpacking through South America",
    "Planning a 6-month backpacking trip through South America starting in Colombia and ending in Patagonia. Has anyone done this route? What's a realistic daily budget? Any must-see spots that aren't in the typical tourist guides?",
    6,
    1,
    38,
  );

  insertPost.run(
    "Japan in cherry blossom season - worth the crowds?",
    "I've always dreamed of seeing Japan during sakura season, but I've heard it's incredibly crowded and expensive. Is it worth it, or should I visit during a quieter time? Looking for honest opinions from people who've been.",
    1,
    1,
    52,
  );

  insertPost.run(
    "Best travel credit cards for international trips?",
    "Trying to maximize points and minimize foreign transaction fees. Currently looking at Chase Sapphire Preferred vs Amex Platinum. What do you all use for international travel? Any tips for earning/redeeming points?",
    4,
    1,
    31,
  );

  insertPost.run(
    "How to deal with travel burnout?",
    "Been traveling for 4 months now and I'm exhausted. The constant moving, packing, and decision-making is getting to me. Has anyone else experienced this? How do you recharge while still on the road?",
    3,
    1,
    67,
  );

  insertPost.run(
    "Best destinations for digital nomads in 2024?",
    "Looking for cities with good WiFi, affordable cost of living, and a solid nomad community. Currently considering Lisbon, Bali, or Medellin. What are your experiences? Any underrated spots I should consider?",
    6,
    1,
    43,
  );

  insertPost.run(
    "Packing light: one bag travel tips",
    "I want to switch to one-bag travel for my upcoming 3-week Europe trip. Currently I overpack terribly. What are your must-have items and what can I actually leave behind? Bonus points for specific bag recommendations!",
    1,
    1,
    29,
  );

  insertPost.run(
    "Language barrier tips for non-English speaking countries",
    "Heading to rural Japan and South Korea where English isn't widely spoken. Beyond translation apps, what strategies help you communicate and connect with locals when you don't speak the language?",
    4,
    1,
    35,
  );

  insertPost.run(
    "Train travel in Europe vs flying - which is better?",
    "Planning a multi-city Europe trip and debating between trains and budget airlines. Eurail pass seems expensive but flying feels wasteful. What's the best approach for covering Germany, Italy, and France?",
    3,
    1,
    41,
  );

  insertPost.run(
    "Best travel insurance for adventure activities?",
    "Planning a trip with scuba diving, motorcycle riding, and hiking. Most basic insurance doesn't cover these. What providers cover adventure sports without breaking the bank?",
    6,
    1,
    27,
  );

  insertPost.run(
    "Dealing with homesickness during long-term travel",
    "Six weeks into a year-long trip and I'm missing home more than expected. My family, my routine, even my boring apartment. How do other long-term travelers handle these feelings?",
    1,
    1,
    54,
  );

  insertPost.run(
    "Best apps for finding local experiences while traveling",
    "Beyond Airbnb Experiences (which can be pricey), what apps or websites do you use to find authentic local activities, food tours, or meetups with locals?",
    4,
    1,
    33,
  );

  insertPost.run(
    "Photography gear for travel - what's essential?",
    "I want to up my travel photography game but don't want to carry tons of gear. What's the sweet spot between a smartphone and full DSLR setup? Any recommendations for versatile, lightweight options?",
    3,
    1,
    38,
  );

  insertPost.run(
    "How to travel with dietary restrictions",
    "I'm vegan and gluten-free, heading to countries where these concepts aren't widely understood. How do you all handle dietary restrictions while traveling? Any apps, translation cards, or strategies that work?",
    6,
    1,
    44,
  );

  // ============ TECHNOLOGY POSTS (15 posts) ============
  const techPost1 = insertPost.run(
    "Is it worth learning Rust in 2024?",
    "I've been a Python/JavaScript developer for 5 years. Seeing a lot of buzz around Rust lately, especially for systems programming and WebAssembly. Is it worth investing time to learn Rust, or should I focus on other technologies? What's the job market like?",
    2,
    2,
    67,
  );
  insertReply.run(
    "Absolutely worth it! Rust has been voted the most loved language for 8 years straight on Stack Overflow. The learning curve is steep but the memory safety guarantees are game-changing.",
    4,
    techPost1.lastInsertRowid,
    null,
    35,
  );

  const techPost2 = insertPost.run(
    "Best practices for API design in 2024",
    "Working on a new REST API for our startup. What are the current best practices? We're debating between REST, GraphQL, and gRPC. The API will serve both web and mobile clients. Any recommendations on versioning, authentication, and documentation?",
    4,
    2,
    38,
  );
  insertReply.run(
    "For public APIs serving web/mobile, I'd still recommend REST with OpenAPI spec. GraphQL is great but adds complexity.",
    2,
    techPost2.lastInsertRowid,
    null,
    20,
  );

  insertPost.run(
    "How do you stay updated with rapidly changing tech?",
    "The tech landscape changes so fast - new frameworks, tools, AI advancements every week. How do you filter the noise and decide what's worth learning? I feel like I'm always behind.",
    7,
    2,
    82,
  );

  insertPost.run(
    "Docker vs Kubernetes for small teams",
    "We're a team of 5 developers building a SaaS product. Currently using Docker Compose for local dev but discussing Kubernetes for production. Is K8s overkill for our size? What's the right complexity level?",
    2,
    2,
    45,
  );

  insertPost.run(
    "AI coding assistants - are they actually helpful?",
    "Been using GitHub Copilot for a month now. Sometimes it's magic, sometimes it suggests terrible code. What's your experience with AI coding tools? Do they actually improve productivity or just add noise?",
    4,
    2,
    91,
  );

  insertPost.run(
    "Best resources for learning system design?",
    "Preparing for senior engineer interviews and system design is my weak point. I can code fine but struggle with designing scalable systems. What resources helped you level up in this area?",
    7,
    2,
    56,
  );

  insertPost.run(
    "Managing technical debt - when to pay it off?",
    "Our codebase has accumulated significant tech debt over 3 years. Management wants new features but the debt is slowing us down. How do you convince stakeholders to invest in refactoring?",
    2,
    2,
    63,
  );

  insertPost.run(
    "TypeScript vs JavaScript in 2024 - is TS worth the overhead?",
    "Starting a new React project and debating TypeScript. The type safety is appealing but setup and build times concern me. For those who've used both extensively, is TS worth it for smaller projects?",
    4,
    2,
    48,
  );

  insertPost.run(
    "Self-hosting vs cloud services - finding the balance",
    "Tired of monthly cloud bills but nervous about self-hosting reliability. What services do you self-host vs pay for? Looking for a pragmatic middle ground.",
    7,
    2,
    37,
  );

  insertPost.run(
    "Best practices for code reviews",
    "Our team's code reviews are inconsistent - sometimes nitpicky, sometimes things slip through. How do you structure effective code reviews that catch real issues without being demoralizing?",
    2,
    2,
    54,
  );

  insertPost.run(
    "Database choices in 2024 - PostgreSQL vs alternatives",
    "Every new project I default to PostgreSQL. But with options like PlanetScale, CockroachDB, and various NoSQL solutions, am I being too conservative? When would you choose something else?",
    4,
    2,
    42,
  );

  insertPost.run(
    "How to build a personal brand as a developer?",
    "I see developers with huge Twitter followings and popular blogs. Is building a personal brand worth the time investment? Has it helped your career? Where should a beginner start?",
    7,
    2,
    39,
  );

  insertPost.run(
    "Remote development environments - worth the complexity?",
    "Considering moving to cloud-based dev environments (Gitpod, Codespaces). Has anyone fully switched? Worried about latency and offline work. What's your experience?",
    2,
    2,
    33,
  );

  insertPost.run(
    "Testing strategies - how much is enough?",
    "Are arguments about 100% code coverage worth having? What's a pragmatic approach to testing that catches bugs without slowing development to a crawl?",
    4,
    2,
    58,
  );

  insertPost.run(
    "Microservices regrets - when monolith is better",
    "We split our monolith into microservices 2 years ago. Now dealing with distributed system complexity that outweighs benefits. Anyone else regret going microservices too early?",
    7,
    2,
    71,
  );

  // ============ CAREER POSTS (15 posts) ============
  const careerPost1 = insertPost.run(
    "How to negotiate salary when switching jobs?",
    "I have an offer from a new company that's about 15% higher than my current salary, but I know the role typically pays more based on my research. First time negotiating - how do I approach this without losing the offer?",
    4,
    3,
    89,
  );
  insertReply.run(
    "Never accept the first offer! Express enthusiasm first, then negotiate. Always give a range with your target at the bottom.",
    1,
    careerPost1.lastInsertRowid,
    null,
    45,
  );

  const careerPost2 = insertPost.run(
    "Transitioning from engineering to product management",
    "Been a software engineer for 6 years and interested in moving to product management. Have any engineers here made this transition? What skills should I focus on developing?",
    2,
    3,
    52,
  );
  insertReply.run(
    "Made this switch 2 years ago! Your engineering background is actually a huge advantage. Focus on stakeholder communication and customer empathy.",
    4,
    careerPost2.lastInsertRowid,
    null,
    26,
  );

  insertPost.run(
    "Is a CS degree still necessary in 2024?",
    "Self-taught developer considering going back for a CS degree at 28. Is it worth 4 years and significant debt? Or would that time be better spent building projects and gaining experience?",
    5,
    3,
    76,
  );

  insertPost.run(
    "How to handle a toxic manager?",
    "My manager takes credit for team work, throws people under the bus, and micromanages. Currently job hunting but need strategies to survive until I can leave. How have you handled toxic leadership?",
    4,
    3,
    98,
  );

  insertPost.run(
    "Remote work vs office - which is better for career growth?",
    'I can work fully remote but worry about being "out of sight, out of mind" for promotions. Those who work remote - has it affected your career progression? How do you stay visible?',
    2,
    3,
    64,
  );

  insertPost.run(
    "Dealing with imposter syndrome as a senior developer",
    "10 years in tech and I still feel like a fraud sometimes. Thought it would go away with experience but it hasn't. How do other experienced developers handle imposter syndrome?",
    5,
    3,
    87,
  );

  insertPost.run(
    "When is it time to leave your job?",
    "Been at my company for 4 years. Comfortable but feeling stagnant. No clear growth path but also scared of change. How do you know when it's time to move on vs just needing a mindset shift?",
    4,
    3,
    71,
  );

  insertPost.run(
    "Best way to prepare for behavioral interviews?",
    'Technical interviews I can handle, but behavioral questions throw me off. I ramble or blank entirely. What strategies helped you nail the "Tell me about a time when..." questions?',
    2,
    3,
    43,
  );

  insertPost.run(
    "Should I accept a lower title for higher pay?",
    "Got an offer that's 30% more than current salary but the title is a step down (Senior to Mid-level). Company says titles don't matter but I'm not so sure. What would you do?",
    5,
    3,
    55,
  );

  insertPost.run(
    "How to ask for a promotion effectively?",
    "Been exceeding expectations for 2 years but no promotion discussion from my manager. How do you initiate this conversation? What evidence should I bring? Is there a right timing?",
    4,
    3,
    68,
  );

  insertPost.run(
    "Managing up - how to work with a disorganized boss",
    "My manager is brilliant but completely scattered. Misses meetings, forgets decisions, loses track of priorities. How do I succeed when my leader is chaos incarnate?",
    2,
    3,
    47,
  );

  insertPost.run(
    "Is job hopping still stigmatized?",
    "I've had 4 jobs in 5 years, each with good reasons for leaving. Worried my resume looks flaky but each move was beneficial. How do recruiters actually view job hopping in 2024?",
    5,
    3,
    62,
  );

  insertPost.run(
    "How to build skills when your job is boring",
    "My day job is maintenance mode - same tasks, no learning. It pays well but I'm worried about skill atrophy. How do you grow professionally when your job doesn't challenge you?",
    4,
    3,
    51,
  );

  insertPost.run(
    "Freelancing vs full-time employment pros and cons",
    "Considering going freelance after 8 years of employment. The freedom appeals but so does stability. Freelancers - what do you wish you knew before making the jump?",
    2,
    3,
    59,
  );

  insertPost.run(
    "How to network as an introvert",
    "I know networking is important but as an introvert, conferences and meetups drain me. How do fellow introverts build professional relationships without exhausting themselves?",
    5,
    3,
    74,
  );

  // ============ MOVIE POSTS (15 posts) ============
  const moviePost1 = insertPost.run(
    "Underrated sci-fi movies recommendations?",
    "Looking for sci-fi movies that flew under the radar. I've seen all the popular ones (Blade Runner, Interstellar, Arrival, etc.). Want something thought-provoking that most people haven't heard of.",
    3,
    4,
    73,
  );
  insertReply.run(
    "Coherence (2013) - low budget but incredibly mind-bending. It's about a dinner party where reality starts fragmenting.",
    5,
    moviePost1.lastInsertRowid,
    null,
    38,
  );
  insertReply.run(
    "Moon (2009) with Sam Rockwell. If you somehow missed this one, it's a must-watch. Minimal cast, maximum impact.",
    1,
    moviePost1.lastInsertRowid,
    null,
    35,
  );

  const moviePost2 = insertPost.run(
    "What makes a great movie villain?",
    "Been thinking about memorable villains like Hannibal Lecter, Joker (Heath Ledger), and Anton Chigurh. What do you think makes a villain truly compelling?",
    5,
    4,
    41,
  );
  insertReply.run(
    "The best villains believe they're the hero of their own story. Thanos genuinely thought he was saving the universe.",
    3,
    moviePost2.lastInsertRowid,
    null,
    25,
  );

  insertPost.run(
    "Movies that changed your perspective on life",
    "Sometimes a film really shifts how you see the world. What movies genuinely changed your perspective or worldview? Looking for films with lasting impact, not just entertainment.",
    8,
    4,
    89,
  );

  insertPost.run(
    "Best cinematography in recent films?",
    "I'm a sucker for beautiful cinematography. What recent films (last 5 years) have absolutely stunning visuals? Bonus if the storytelling matches the visual quality.",
    3,
    4,
    56,
  );

  insertPost.run(
    "Foreign films that deserve more attention",
    "Hollywood dominates discussions but so many incredible films come from other countries. What foreign language films would you recommend to someone just starting to explore non-English cinema?",
    5,
    4,
    67,
  );

  insertPost.run(
    "Movies better than the books they're based on",
    "Usually we say the book is better, but I think Fight Club and The Shining are better as films. What other movies actually improved on the source material?",
    8,
    4,
    78,
  );

  insertPost.run(
    "What's a movie you can watch infinite times?",
    "We all have that comfort movie we can rewatch endlessly. What's yours and what makes it so rewatchable? Mine is The Princess Bride - quotable, heartfelt, and perfectly paced.",
    3,
    4,
    94,
  );

  insertPost.run(
    "Best movie scores and soundtracks?",
    "Music can make or break a film. What movies have soundtracks that elevate them to another level? Looking for scores that work both in the film and standalone.",
    5,
    4,
    51,
  );

  insertPost.run(
    "Disappointing sequels that ruined franchises",
    "Just watched a sequel that completely missed what made the original special. What sequels disappointed you the most? And can a bad sequel actually ruin the original retroactively?",
    8,
    4,
    63,
  );

  insertPost.run(
    "Best directorial debuts of all time?",
    "Some directors hit it out of the park with their first film. What are the most impressive directorial debuts? I'd say Reservoir Dogs and Get Out are up there.",
    3,
    4,
    47,
  );

  insertPost.run(
    "Actors you'll watch in anything",
    "Are there actors whose presence alone gets you to watch a movie? For me, it's Oscar Isaac and Saoirse Ronan. Who are your \"watch anything they're in\" actors?",
    5,
    4,
    82,
  );

  insertPost.run(
    "Most emotionally devastating movies?",
    "Sometimes you want to feel something deeply. What movies absolutely wrecked you emotionally? Looking for films that hit hard, not just sad for sad's sake.",
    8,
    4,
    71,
  );

  insertPost.run(
    "Practical effects vs CGI - what's your preference?",
    "I have a soft spot for practical effects, but CGI has enabled incredible things. Where do you stand? Any films that nail the balance perfectly?",
    3,
    4,
    44,
  );

  insertPost.run(
    "Comedy films that are genuinely intelligent?",
    "Looking for comedies that don't rely on crude humor or lazy writing. Films that are actually clever and smart while being funny. What are your recommendations?",
    5,
    4,
    38,
  );

  insertPost.run(
    "Best plot twists that actually make sense?",
    "I love a good plot twist but hate when they feel cheap or make no sense on rewatch. What movies have twists that are both surprising AND logical when you think about it?",
    8,
    4,
    69,
  );

  // ============ NEWS POSTS (15 posts) ============
  const newsPost1 = insertPost.run(
    "How do you stay informed without doomscrolling?",
    "I want to stay updated on current events but find myself getting anxious from constant news consumption. How do you balance staying informed with protecting your mental health?",
    5,
    5,
    56,
  );
  insertReply.run(
    "I limit news to 30 mins in the morning with coffee. I use an RSS reader with curated sources instead of social media.",
    2,
    newsPost1.lastInsertRowid,
    null,
    30,
  );

  const newsPost2 = insertPost.run(
    "Best sources for unbiased international news?",
    "Looking for news sources that cover international events with minimal bias. Preferably ones that show multiple perspectives on complex issues. Currently using BBC and Reuters but want to diversify.",
    1,
    5,
    34,
  );
  insertReply.run(
    "AP News is excellent - they're a wire service so they focus on facts over opinion.",
    5,
    newsPost2.lastInsertRowid,
    null,
    18,
  );

  insertPost.run(
    "Local news vs national news - what do you follow more?",
    "I've been trying to focus more on local news since it directly affects my daily life. But I feel disconnected from bigger issues. How do you balance local vs national/global news consumption?",
    6,
    5,
    42,
  );

  insertPost.run(
    "How to discuss news without losing friends?",
    "Political discussions with friends and family have become minefields. How do you have productive conversations about current events without damaging relationships?",
    5,
    5,
    78,
  );

  insertPost.run(
    "Podcasts for balanced news analysis?",
    "Looking for news podcasts that help me understand issues rather than just react to headlines. Preferably ones that present multiple viewpoints fairly. What do you listen to?",
    1,
    5,
    38,
  );

  insertPost.run(
    "Is traditional journalism dying?",
    "With layoffs at major publications and the rise of Substack/social media, what's the future of journalism? Who will do investigative reporting if newspapers can't survive?",
    6,
    5,
    63,
  );

  insertPost.run(
    "How to identify misinformation?",
    "It's getting harder to separate fact from fiction online. What specific strategies and tools do you use to verify information before believing or sharing it?",
    5,
    5,
    87,
  );

  insertPost.run(
    "News fatigue - how to stay engaged without burning out",
    "Important things are happening but I'm emotionally exhausted from caring. How do you stay informed and engaged as a citizen without constant anxiety?",
    1,
    5,
    71,
  );

  insertPost.run(
    "Best newsletters for weekly news summaries?",
    "Don't have time for daily news but want to stay informed. What weekly newsletters give you a solid overview of what mattered without sensationalism?",
    6,
    5,
    45,
  );

  insertPost.run(
    "How social media has changed news consumption",
    "I get most of my news from Twitter and Reddit rather than traditional sources. Is this problematic? How has your news consumption evolved with social media?",
    5,
    5,
    52,
  );

  insertPost.run(
    "Supporting local journalism - how and why?",
    "Local newspapers are struggling but they're important for community accountability. Do you subscribe to local news? How do you support journalism that matters?",
    1,
    5,
    39,
  );

  insertPost.run(
    "International perspectives on US news",
    "I've noticed foreign coverage of US events is often quite different from domestic coverage. What non-US sources do you follow for a different perspective on American news?",
    6,
    5,
    44,
  );

  insertPost.run(
    "Constructive news - focusing on solutions not just problems",
    "Are there news sources that focus on solutions journalism? Tired of being told what's wrong without any discussion of what might work. Want informed hope, not just doom.",
    5,
    5,
    58,
  );

  insertPost.run(
    "Teaching kids to be news literate",
    "As a parent, I want my kids to be informed but also critical of information. What age-appropriate resources or strategies help children develop news literacy?",
    1,
    5,
    36,
  );

  insertPost.run(
    "The attention economy and news - are we being manipulated?",
    "News organizations optimize for clicks and engagement, not necessarily truth or importance. How do we as consumers resist manipulation while staying informed?",
    6,
    5,
    67,
  );

  // ============ GENERAL POSTS (15 posts) ============
  const generalPost1 = insertPost.run(
    "What's a skill you learned as an adult that changed your life?",
    "Curious what skills people picked up later in life that made a significant impact. For me, it was learning to cook properly at 28 - saved money, improved my health, and became a great way to socialize. What's yours?",
    1,
    6,
    112,
  );
  insertReply.run(
    "Therapy/emotional intelligence at 32. Learning to understand and communicate my emotions improved every relationship in my life.",
    4,
    generalPost1.lastInsertRowid,
    null,
    58,
  );
  insertReply.run(
    "Basic home repairs at 35. YouTube taught me to fix plumbing and electrical issues. Saved thousands.",
    2,
    generalPost1.lastInsertRowid,
    null,
    42,
  );

  const generalPost2 = insertPost.run(
    "How do you maintain long-distance friendships?",
    "As I get older, my closest friends are scattered across different cities and countries. We all have busy lives and it's hard to keep in touch. How do you maintain meaningful long-distance friendships?",
    3,
    6,
    48,
  );
  insertReply.run(
    "Weekly voice notes instead of texts! My best friend and I send 5-10 minute audio messages. Way more personal than typing.",
    1,
    generalPost2.lastInsertRowid,
    null,
    25,
  );

  insertPost.run(
    "What habit most improved your quality of life?",
    "Small habits can have outsized effects. What single habit has had the biggest positive impact on your daily life? For me, it's making my bed every morning - sounds silly but it works.",
    6,
    6,
    94,
  );

  insertPost.run(
    "Books that genuinely changed how you think",
    "Looking for book recommendations that offer genuinely new perspectives or mental models. Not just good stories, but books that rewired how you approach problems or life.",
    1,
    6,
    78,
  );

  insertPost.run(
    "How do you make major life decisions?",
    "Facing a big decision (career change, moving cities, relationship) and feeling paralyzed. How do you approach major life decisions? Any frameworks or approaches that help?",
    3,
    6,
    83,
  );

  insertPost.run(
    "Digital minimalism - has anyone actually achieved it?",
    "I keep trying to reduce screen time but fail repeatedly. Has anyone successfully implemented digital minimalism while still being able to function in a connected world?",
    6,
    6,
    67,
  );

  insertPost.run(
    "What do you wish you knew at 25?",
    "Just turned 25 and feeling like I should be further along in life. For those who are older, what do you wish someone had told you at this age? What actually matters?",
    1,
    6,
    105,
  );

  insertPost.run(
    "How to build discipline vs relying on motivation",
    "I'm great at starting things when motivated but terrible at follow-through. How do you build actual discipline? Any strategies that stuck for you long-term?",
    3,
    6,
    89,
  );

  insertPost.run(
    "Making friends as an adult - it's hard right?",
    "Moved to a new city at 32 and making friends feels impossible. Everyone already has established friend groups. How do adults make genuine friendships outside work?",
    6,
    6,
    76,
  );

  insertPost.run(
    "Dealing with comparison in the social media age",
    "I know comparison is the thief of joy but it's hard not to compare yourself to highlight reels online. How do you maintain perspective and self-worth in the Instagram era?",
    1,
    6,
    72,
  );

  insertPost.run(
    'What\'s your "life hack" that actually works?',
    "So many life hacks are gimmicks. What's something you do that genuinely makes your life better or easier that others might not have thought of?",
    3,
    6,
    98,
  );

  insertPost.run(
    "How do you define success for yourself?",
    "Society has default definitions of success (money, status, family) but they don't fit everyone. How have you defined what success means for you personally?",
    6,
    6,
    64,
  );

  insertPost.run(
    "Hobbies that help you disconnect from work",
    "I need hobbies that are completely different from my desk job. What activities have you found that really help you disconnect and recharge? Bonus if they're social.",
    1,
    6,
    53,
  );

  insertPost.run(
    "Learning to be comfortable with uncertainty",
    "The future always feels uncertain and that used to paralyze me. How do you make peace with not knowing what comes next? Any mental shifts that helped?",
    3,
    6,
    71,
  );

  insertPost.run(
    "Best advice you've ever received",
    "What's a piece of advice that stuck with you and genuinely helped shape your life? Could be from a mentor, book, random stranger - wherever wisdom found you.",
    6,
    6,
    86,
  );

  console.log("Database seeded with 15 posts per category!");
}

// Initialize database on module load
initializeDatabase();

module.exports = db;
