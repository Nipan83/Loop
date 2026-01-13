const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'loop.db'));

// Enable foreign keys
db.pragma('foreign_keys = ON');

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

  // Create indexes for better performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category_id);
    CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id);
    CREATE INDEX IF NOT EXISTS idx_replies_post ON replies(post_id);
    CREATE INDEX IF NOT EXISTS idx_replies_parent ON replies(parent_reply_id);
    CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);
  `);

  // Seed initial data
  seedData();
}

function seedData() {
  // Check if categories already exist
  const categoryCount = db.prepare('SELECT COUNT(*) as count FROM categories').get();
  if (categoryCount.count > 0) return;

  // Insert categories
  const categories = [
    { name: 'Travel', slug: 'travel', icon: '🌍', description: 'Travel tips, destinations, and experiences' },
    { name: 'Technology', slug: 'technology', icon: '💻', description: 'Tech news, programming, and gadgets' },
    { name: 'Career', slug: 'career', icon: '💼', description: 'Job advice and professional development' },
    { name: 'Movie', slug: 'movie', icon: '🎬', description: 'Film discussions, reviews, and recommendations' },
    { name: 'News', slug: 'news', icon: '📰', description: 'Current events and world news' },
    { name: 'General', slug: 'general', icon: '💬', description: 'Everything else' }
  ];

  const insertCategory = db.prepare('INSERT INTO categories (name, slug, icon, description) VALUES (?, ?, ?, ?)');
  categories.forEach(cat => {
    insertCategory.run(cat.name, cat.slug, cat.icon, cat.description);
  });

  // Create demo users
  const hashedPassword = bcrypt.hashSync('password123', 10);
  const insertUser = db.prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)');
  
  const demoUsers = [
    { username: 'traveler_jane', email: 'jane@example.com' },
    { username: 'tech_guru', email: 'techguru@example.com' },
    { username: 'movie_buff', email: 'moviebuff@example.com' },
    { username: 'career_coach', email: 'coach@example.com' },
    { username: 'news_junkie', email: 'newsjunkie@example.com' }
  ];

  demoUsers.forEach(user => {
    insertUser.run(user.username, user.email, hashedPassword);
  });

  // Insert sample posts
  const insertPost = db.prepare('INSERT INTO posts (title, content, user_id, category_id, upvotes) VALUES (?, ?, ?, ?, ?)');
  const insertReply = db.prepare('INSERT INTO replies (content, user_id, post_id, parent_reply_id, upvotes) VALUES (?, ?, ?, ?, ?)');

  // Travel posts
  const travelPost1 = insertPost.run(
    'Best hidden gems in Southeast Asia?',
    'I\'m planning a 3-month trip to Southeast Asia and want to visit places that are off the beaten path. Already been to the popular spots in Thailand and Bali. Looking for local recommendations for Vietnam, Cambodia, and the Philippines. Budget is around $50/day. What are your favorite hidden gems?',
    1, 1, 24
  );

  insertReply.run('Check out Phong Nha in Vietnam - the caves there are absolutely incredible and way less touristy than Ha Long Bay. You can easily spend 3-4 days exploring the area.', 2, travelPost1.lastInsertRowid, null, 15);
  insertReply.run('Siquijor Island in the Philippines is magical! It\'s known as the "Island of Fire" and has beautiful waterfalls, beaches, and a mystical vibe. Very budget-friendly too.', 3, travelPost1.lastInsertRowid, null, 12);
  insertReply.run('For Cambodia, skip Siem Reap crowds and head to Battambang. It has amazing French colonial architecture, the bamboo train, and Phare circus. Plus the food scene is incredible!', 4, travelPost1.lastInsertRowid, null, 8);

  const travelPost2 = insertPost.run(
    'Solo female travel safety tips',
    'First time solo traveling as a woman, heading to Europe for a month. Would love to hear safety tips and must-know advice from experienced solo female travelers. I\'ll be visiting Paris, Barcelona, Rome, and Amsterdam.',
    3, 1, 45
  );

  insertReply.run('Trust your instincts! If something feels off, remove yourself from the situation. Also, I always share my location with family and check in daily.', 1, travelPost2.lastInsertRowid, null, 22);
  insertReply.run('Stay in hostels with good female dorm reviews. Great way to meet other solo travelers and get local tips. Hostelworld ratings are reliable.', 4, travelPost2.lastInsertRowid, null, 18);

  // Technology posts
  const techPost1 = insertPost.run(
    'Is it worth learning Rust in 2024?',
    'I\'ve been a Python/JavaScript developer for 5 years. Seeing a lot of buzz around Rust lately, especially for systems programming and WebAssembly. Is it worth investing time to learn Rust, or should I focus on other technologies? What\'s the job market like?',
    2, 2, 67
  );

  insertReply.run('Absolutely worth it! Rust has been voted the most loved language for 8 years straight on Stack Overflow. The learning curve is steep but the memory safety guarantees are game-changing.', 4, techPost1.lastInsertRowid, null, 35);
  const rustReply = insertReply.run('Job market is growing rapidly. A lot of crypto/blockchain companies, cloud infrastructure (AWS, Cloudflare), and even Discord uses Rust for performance-critical parts.', 5, techPost1.lastInsertRowid, null, 28);
  insertReply.run('I second this! Just got a Rust position at a fintech company. Salary was 20% higher than my previous JS role.', 1, techPost1.lastInsertRowid, rustReply.lastInsertRowid, 15);

  const techPost2 = insertPost.run(
    'Best practices for API design in 2024',
    'Working on a new REST API for our startup. What are the current best practices? We\'re debating between REST, GraphQL, and gRPC. The API will serve both web and mobile clients. Any recommendations on versioning, authentication, and documentation?',
    4, 2, 38
  );

  insertReply.run('For public APIs serving web/mobile, I\'d still recommend REST with OpenAPI spec. GraphQL is great but adds complexity. Use JWT for auth, semantic versioning in URL (v1, v2), and generate docs from OpenAPI.', 2, techPost2.lastInsertRowid, null, 20);
  insertReply.run('Consider tRPC if you\'re using TypeScript on both ends - end-to-end type safety is amazing for developer experience. We switched from REST and haven\'t looked back.', 5, techPost2.lastInsertRowid, null, 16);

  // Career posts
  const careerPost1 = insertPost.run(
    'How to negotiate salary when switching jobs?',
    'I have an offer from a new company that\'s about 15% higher than my current salary, but I know the role typically pays more based on my research. First time negotiating - how do I approach this without losing the offer? Any scripts or strategies that worked for you?',
    4, 3, 89
  );

  insertReply.run('Never accept the first offer! Express enthusiasm first, then say "Based on my research and experience, I was expecting something in the range of X-Y. Is there flexibility on the base salary?" Always give a range with your target at the bottom.', 1, careerPost1.lastInsertRowid, null, 45);
  insertReply.run('Don\'t forget to negotiate other benefits too - signing bonus, extra PTO, remote work flexibility, professional development budget. Sometimes these are easier to get than salary bumps.', 3, careerPost1.lastInsertRowid, null, 32);
  insertReply.run('Get competing offers if possible. Nothing strengthens your position more than being able to say "I have another offer at X amount" - just be honest about it.', 5, careerPost1.lastInsertRowid, null, 28);

  const careerPost2 = insertPost.run(
    'Transitioning from engineering to product management',
    'Been a software engineer for 6 years and interested in moving to product management. Have any engineers here made this transition? What skills should I focus on developing? Should I get an MBA or are there better alternatives?',
    2, 3, 52
  );

  insertReply.run('Made this switch 2 years ago! Your engineering background is actually a huge advantage. Focus on: stakeholder communication, customer empathy, and data analysis. Skip the MBA - build a side project and document your PM thinking process instead.', 4, careerPost2.lastInsertRowid, null, 26);
  insertReply.run('Start by taking on more product-oriented tasks in your current role. Volunteer to write PRDs, conduct user interviews, or own a feature end-to-end. This gives you real experience to talk about in interviews.', 1, careerPost2.lastInsertRowid, null, 20);

  // Movie posts
  const moviePost1 = insertPost.run(
    'Underrated sci-fi movies recommendations?',
    'Looking for sci-fi movies that flew under the radar. I\'ve seen all the popular ones (Blade Runner, Interstellar, Arrival, etc.). Want something thought-provoking that most people haven\'t heard of. Doesn\'t matter if it\'s old or new, just quality storytelling over special effects.',
    3, 4, 73
  );

  insertReply.run('Coherence (2013) - low budget but incredibly mind-bending. It\'s about a dinner party where reality starts fragmenting. The less you know going in, the better. Available on most streaming platforms.', 5, moviePost1.lastInsertRowid, null, 38);
  insertReply.run('Moon (2009) with Sam Rockwell. If you somehow missed this one, it\'s a must-watch. Minimal cast, maximum impact. Explores identity and isolation in space.', 1, moviePost1.lastInsertRowid, null, 35);
  insertReply.run('Primer (2004) - made for $7,000 and it\'s one of the most complex time travel movies ever. You\'ll need a flowchart to understand it but that\'s part of the fun.', 4, moviePost1.lastInsertRowid, null, 29);
  insertReply.run('Dark City (1998) - came out the year before The Matrix and has similar themes but a completely different aesthetic. Criminally underrated noir sci-fi.', 2, moviePost1.lastInsertRowid, null, 24);

  const moviePost2 = insertPost.run(
    'What makes a great movie villain?',
    'Been thinking about memorable villains like Hannibal Lecter, Joker (Heath Ledger), and Anton Chigurh. What do you think makes a villain truly compelling? Is it their motivation, acting, writing, or something else entirely? Who are your favorite movie villains and why?',
    5, 4, 41
  );

  insertReply.run('The best villains believe they\'re the hero of their own story. Thanos genuinely thought he was saving the universe. That conviction makes them terrifying because you can almost understand their logic.', 3, moviePost2.lastInsertRowid, null, 25);
  insertReply.run('Screen presence matters so much. Anthony Hopkins was only in Silence of the Lambs for 16 minutes but won an Oscar. It\'s about owning every second you\'re on camera.', 1, moviePost2.lastInsertRowid, null, 19);

  // News posts
  const newsPost1 = insertPost.run(
    'How do you stay informed without doomscrolling?',
    'I want to stay updated on current events but find myself getting anxious from constant news consumption. How do you balance staying informed with protecting your mental health? Any tips for healthy news consumption habits?',
    5, 5, 56
  );

  insertReply.run('I limit news to 30 mins in the morning with coffee. I use an RSS reader (Feedly) with curated sources instead of social media. No news after 7pm - game changer for sleep quality.', 2, newsPost1.lastInsertRowid, null, 30);
  insertReply.run('Weekly news digests work for me. The Economist and newsletters like Morning Brew give you the important stuff without the noise. Most "breaking news" isn\'t actually urgent to know.', 4, newsPost1.lastInsertRowid, null, 26);
  insertReply.run('Delete news apps from your phone. If something is truly important, you\'ll hear about it. I only read longform journalism on weekends now and feel much better informed than when I was constantly refreshing Twitter.', 1, newsPost1.lastInsertRowid, null, 22);

  const newsPost2 = insertPost.run(
    'Best sources for unbiased international news?',
    'Looking for news sources that cover international events with minimal bias. Preferably ones that show multiple perspectives on complex issues. Currently using BBC and Reuters but want to diversify. Any recommendations?',
    1, 5, 34
  );

  insertReply.run('AP News is excellent - they\'re a wire service so they focus on facts over opinion. Also check out The Christian Science Monitor (despite the name, it\'s secular and has great international coverage).', 5, newsPost2.lastInsertRowid, null, 18);
  insertReply.run('I use Ground News app - it shows how the same story is covered across the political spectrum and highlights blind spots. Really eye-opening for understanding media bias.', 3, newsPost2.lastInsertRowid, null, 15);

  // General posts
  const generalPost1 = insertPost.run(
    'What\'s a skill you learned as an adult that changed your life?',
    'Curious what skills people picked up later in life that made a significant impact. For me, it was learning to cook properly at 28 - saved money, improved my health, and became a great way to socialize. What\'s yours?',
    1, 6, 112
  );

  insertReply.run('Therapy/emotional intelligence at 32. Learning to understand and communicate my emotions improved every relationship in my life - marriage, friendships, work. Wish I\'d started sooner.', 4, generalPost1.lastInsertRowid, null, 58);
  insertReply.run('Basic home repairs at 35. YouTube taught me to fix plumbing, electrical issues, and drywall. Saved thousands and there\'s something deeply satisfying about fixing things with your own hands.', 2, generalPost1.lastInsertRowid, null, 42);
  insertReply.run('Touch typing at 25. I was a hunt-and-peck typer my whole life. Took a month to learn properly and now I type 80+ WPM. As someone who writes for work, it changed everything.', 5, generalPost1.lastInsertRowid, null, 35);
  insertReply.run('Learning to say no. Not really a "skill" but it took me until 30 to realize I was overcommitting to everything. Setting boundaries has been transformative for my mental health and productivity.', 3, generalPost1.lastInsertRowid, null, 31);

  const generalPost2 = insertPost.run(
    'How do you maintain long-distance friendships?',
    'As I get older, my closest friends are scattered across different cities and countries. We all have busy lives and it\'s hard to keep in touch beyond occasional texts. How do you maintain meaningful long-distance friendships? Any creative solutions?',
    3, 6, 48
  );

  insertReply.run('Weekly voice notes instead of texts! My best friend and I send 5-10 minute audio messages. It\'s like having a conversation but asynchronous. Way more personal than typing.', 1, generalPost2.lastInsertRowid, null, 25);
  insertReply.run('We have a monthly video game night. Pick a multiplayer game and schedule it like you would a work meeting. Been doing this for 4 years with college friends across 3 time zones.', 2, generalPost2.lastInsertRowid, null, 22);
  insertReply.run('Shared experiences even when apart - we\'ll watch the same movie "together" (start at the same time and text throughout) or read the same book and discuss. Creates things to talk about.', 5, generalPost2.lastInsertRowid, null, 18);

  console.log('Database seeded with sample data!');
}

// Initialize database on module load
initializeDatabase();

module.exports = db;