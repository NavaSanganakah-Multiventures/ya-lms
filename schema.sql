CREATE TABLE IF NOT EXISTS Users (
      id TEXT PRIMARY KEY,
      full_name TEXT,
      email TEXT UNIQUE NOT NULL,
      role TEXT CHECK(role IN ('admin', 'teacher', 'student')) NOT NULL DEFAULT 'student',
      phone TEXT,
      district TEXT,
      state TEXT,
      country TEXT DEFAULT 'IN',
      birth_date TEXT,
      father_name TEXT,
      mother_name TEXT,
      grand_father_name TEXT,
      pincode TEXT,
      gender TEXT,
      bio TEXT,
      birth_place TEXT,
      -- Deprecated: Use CreditWallets instead. Value kept for backwards compatibility during migration.
      ai_credits INTEGER DEFAULT 50,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE IF NOT EXISTS OTPs (
      email TEXT PRIMARY KEY,
      otp TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      attempts INTEGER DEFAULT 0
    );

CREATE TABLE IF NOT EXISTS Categories (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE IF NOT EXISTS Courses (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      title_hi TEXT,
      description TEXT,
      description_hi TEXT,
      category_id TEXT,
      teacher_id TEXT NOT NULL,
      price_inr INTEGER DEFAULT 0,
      price_usd INTEGER DEFAULT 0,
      thumbnail_url TEXT,
      merchant_default_image_url TEXT,
      self_study_enabled INTEGER DEFAULT 0,
      self_study_credit_cost INTEGER DEFAULT 0,
      self_study_only INTEGER DEFAULT 0,
      individual_class_booking_enabled INTEGER DEFAULT 0,
      individual_class_credit_cost INTEGER DEFAULT 0,
      individual_class_duration_minutes INTEGER DEFAULT 30,
      trial_duration_days INTEGER DEFAULT 0,
      trial_upgrade_price_inr INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES Categories(id) ON DELETE SET NULL,
      FOREIGN KEY (teacher_id) REFERENCES Users(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS Batches (
      id TEXT PRIMARY KEY,
      course_id TEXT,
      book_id TEXT,
      name TEXT NOT NULL,
      name_hi TEXT,
      description_en TEXT,
      description_hi TEXT,
      start_date DATETIME,
      end_date DATETIME,
      class_start_time TEXT,
      class_end_time TEXT,
      class_days TEXT,
      self_study_group_enabled INTEGER DEFAULT 1,
      group_class_credit_cost INTEGER DEFAULT 0,
      group_class_credit_unit TEXT DEFAULT 'class',
      credit_deduction_timing TEXT DEFAULT 'on_join',
      status TEXT CHECK(status IN ('upcoming', 'ongoing', 'completed')) DEFAULT 'upcoming',
      seo_json TEXT,
      google_event_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (course_id) REFERENCES Courses(id) ON DELETE CASCADE,
      FOREIGN KEY (book_id) REFERENCES Books(id) ON DELETE SET NULL
    );

CREATE TABLE IF NOT EXISTS Lessons (
      id TEXT PRIMARY KEY,
      course_id TEXT,
      book_id TEXT,
      batch_id TEXT,
      chapter_title TEXT DEFAULT 'General',
      title TEXT NOT NULL,
      type TEXT CHECK(type IN ('video', 'pdf', 'live', 'image', 'article', 'recording')) NOT NULL,
      content_url TEXT,
      audio_url TEXT,
      order_index INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      text_content TEXT,
      is_free INTEGER DEFAULT 0,
      processing_status TEXT DEFAULT 'pending',
      processing_error TEXT,
      FOREIGN KEY (course_id) REFERENCES Courses(id) ON DELETE CASCADE,
      FOREIGN KEY (book_id) REFERENCES Books(id) ON DELETE CASCADE,
      FOREIGN KEY (batch_id) REFERENCES Batches(id) ON DELETE SET NULL
    );

CREATE TABLE IF NOT EXISTS Enrollments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      course_id TEXT,
      book_id TEXT,
      batch_id TEXT,
      progress INTEGER NOT NULL DEFAULT 0,
      certificate_eligible INTEGER DEFAULT 0,
      certificate_issued INTEGER DEFAULT 0,
      certificate_id TEXT,
      certificate_issued_at DATETIME,
      certificate_issued_by TEXT,
      status TEXT CHECK(status IN ('active', 'revoked', 'completed', 'cancelled')) NOT NULL DEFAULT 'active',
      payment_id TEXT,
      -- Canonical default is 'pending' (legacy systems sometimes used 'unpaid')
      payment_status TEXT DEFAULT 'pending',
      amount_paid INTEGER DEFAULT 0,
      payment_source TEXT,
      trial_expires_at DATETIME,
      purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES Courses(id) ON DELETE CASCADE,
      FOREIGN KEY (book_id) REFERENCES Books(id) ON DELETE CASCADE,
      FOREIGN KEY (batch_id) REFERENCES Batches(id) ON DELETE SET NULL
    );

CREATE TABLE IF NOT EXISTS BatchBookMeetings (
      batch_id TEXT NOT NULL,
      book_id TEXT NOT NULL,
      rtc_room_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (batch_id, book_id),
      FOREIGN KEY (batch_id) REFERENCES Batches(id) ON DELETE CASCADE,
      FOREIGN KEY (book_id) REFERENCES Books(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS LiveSessions (
      id TEXT PRIMARY KEY,
      course_id TEXT,
      book_id TEXT,
      batch_id TEXT,
      teacher_id TEXT NOT NULL,
      title TEXT,
      start_time DATETIME NOT NULL,
      rtc_room_id TEXT NOT NULL,
      status TEXT CHECK(status IN ('scheduled', 'live', 'ended')) DEFAULT 'scheduled',
      recording_id TEXT,
      recording_status TEXT DEFAULT 'pending',
      is_free INTEGER DEFAULT 0,
      google_event_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (course_id) REFERENCES Courses(id) ON DELETE CASCADE,
      FOREIGN KEY (book_id) REFERENCES Books(id) ON DELETE CASCADE,
      FOREIGN KEY (batch_id) REFERENCES Batches(id) ON DELETE SET NULL,
      FOREIGN KEY (teacher_id) REFERENCES Users(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS LiveSignaling (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE IF NOT EXISTS Attendance (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      left_at DATETIME,
      FOREIGN KEY (session_id) REFERENCES LiveSessions(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS Exams (
      id TEXT PRIMARY KEY,
      course_id TEXT,
      book_id TEXT,
      batch_id TEXT,
      teacher_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      passing_score INTEGER NOT NULL DEFAULT 50,
      duration_minutes INTEGER DEFAULT 0,
      is_published INTEGER DEFAULT 0,
      total_marks INTEGER DEFAULT 0,
      scheduled_at DATETIME,
      end_at DATETIME,
      google_event_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (course_id) REFERENCES Courses(id) ON DELETE CASCADE,
      FOREIGN KEY (book_id) REFERENCES Books(id) ON DELETE CASCADE,
      FOREIGN KEY (batch_id) REFERENCES Batches(id) ON DELETE SET NULL,
      FOREIGN KEY (teacher_id) REFERENCES Users(id) ON DELETE SET NULL
    );

CREATE TABLE IF NOT EXISTS ExamQuestions (
      id TEXT PRIMARY KEY,
      exam_id TEXT NOT NULL,
      question_text TEXT NOT NULL,
      options_json TEXT NOT NULL,
      correct_option_index INTEGER NOT NULL DEFAULT 0,
      marks INTEGER NOT NULL DEFAULT 1,
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (exam_id) REFERENCES Exams(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS ExamAttempts (
      id TEXT PRIMARY KEY,
      exam_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      answers_json TEXT NOT NULL,
      score INTEGER NOT NULL DEFAULT 0,
      score_percent INTEGER NOT NULL DEFAULT 0,
      total_marks INTEGER NOT NULL DEFAULT 0,
      passed INTEGER DEFAULT 0,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (exam_id) REFERENCES Exams(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS CompletedLessons (
      user_id TEXT NOT NULL,
      lesson_id TEXT NOT NULL,
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      time_spent_seconds INTEGER DEFAULT 0,
      PRIMARY KEY (user_id, lesson_id),
      FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
      FOREIGN KEY (lesson_id) REFERENCES Lessons(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS Certificates (
      id TEXT PRIMARY KEY,
      enrollment_id TEXT NOT NULL UNIQUE,
      user_id TEXT NOT NULL,
      course_id TEXT,
      book_id TEXT,
      issued_by TEXT NOT NULL,
      issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      FOREIGN KEY (enrollment_id) REFERENCES Enrollments(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES Courses(id) ON DELETE CASCADE,
      FOREIGN KEY (book_id) REFERENCES Books(id) ON DELETE CASCADE,
      FOREIGN KEY (issued_by) REFERENCES Users(id) ON DELETE SET NULL
    );

CREATE TABLE IF NOT EXISTS Notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS PushSubscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      endpoint TEXT,
      subscription_json TEXT,
      fcm_token TEXT,
      device_id TEXT,
      platform TEXT CHECK(platform IN ('web', 'flutter_android', 'flutter_ios', 'flutter_web')) NOT NULL DEFAULT 'web',
      user_agent TEXT,
      last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS ChatHistory (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      role TEXT CHECK(role IN ('user', 'assistant')) NOT NULL,
      content TEXT NOT NULL,
      session_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS FormTemplates (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      title_hi TEXT,
      description TEXT,
      description_hi TEXT,
      fields_json TEXT NOT NULL,
      seo_json TEXT,
      theme_json TEXT,
      confirmation_email_body TEXT,
      linked_course_id TEXT,
      book_id TEXT,
      linked_batch_id TEXT,
      auto_enroll INTEGER DEFAULT 0,
      eligibility_criteria TEXT,
      teacher_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (teacher_id) REFERENCES Users(id) ON DELETE SET NULL
    );

CREATE TABLE IF NOT EXISTS FormSubmissions (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL,
      user_id TEXT,
      email TEXT,
      data_json TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      ai_analysis TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (template_id) REFERENCES FormTemplates(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS ErrorSessions (
      id TEXT PRIMARY KEY,
      fingerprint TEXT NOT NULL,
      source TEXT NOT NULL,
      status TEXT DEFAULT 'new',
      severity TEXT DEFAULT 'medium',
      title TEXT NOT NULL,
      error_message TEXT NOT NULL,
      stack_trace TEXT,
      full_payload TEXT,
      ai_prompt TEXT,
      url TEXT,
      user_id TEXT,
      device_info TEXT,
      email_from TEXT,
      email_to TEXT,
      email_subject TEXT,
      repeat_count INTEGER DEFAULT 1,
      last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE IF NOT EXISTS ErrorSessionEvents (
      id TEXT PRIMARY KEY,
      error_session_id TEXT NOT NULL,
      type TEXT NOT NULL,
      payload TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (error_session_id) REFERENCES ErrorSessions(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS JulesJobs (
      id TEXT PRIMARY KEY,
      error_session_id TEXT NOT NULL,
      jules_session_id TEXT,
      prompt TEXT NOT NULL,
      status TEXT DEFAULT 'queued',
      response TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (error_session_id) REFERENCES ErrorSessions(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS EmailDrafts (
      id TEXT PRIMARY KEY,
      recipient TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      is_html INTEGER DEFAULT 1,
      status TEXT CHECK(status IN ('draft', 'sent', 'cancelled')) DEFAULT 'draft',
      admin_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      sent_at DATETIME,
      FOREIGN KEY (admin_id) REFERENCES Users(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS Subscribers (
      email TEXT PRIMARY KEY,
      subscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'active'
    );

CREATE TABLE IF NOT EXISTS BroadcastDrafts (
      id TEXT PRIMARY KEY,
      subject TEXT DEFAULT '',
      message TEXT NOT NULL,
      type TEXT CHECK(type IN ('draft', 'history')) DEFAULT 'draft',
      target_type TEXT DEFAULT 'all',
      target_id TEXT DEFAULT '',
      custom_emails TEXT DEFAULT '',
      send_email INTEGER DEFAULT 1,
      send_notification INTEGER DEFAULT 1,
      send_push INTEGER DEFAULT 0,
      push_audience TEXT DEFAULT 'all',
      admin_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      sent_at DATETIME
    );

CREATE TABLE IF NOT EXISTS SiteSettings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE IF NOT EXISTS PrepaidTimeBank (
      user_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      prepaid_seconds INTEGER NOT NULL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, session_id),
      FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
      FOREIGN KEY (session_id) REFERENCES LiveSessions(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS IndividualBookings (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      teacher_id TEXT NOT NULL,
      status TEXT CHECK(status IN ('scheduled', 'live', 'completed', 'cancelled')) NOT NULL DEFAULT 'scheduled',
      scheduled_at DATETIME NOT NULL,
      start_time DATETIME,
      end_time DATETIME,
      duration_minutes INTEGER DEFAULT 30,
      credits_charged INTEGER DEFAULT 0,
      credits_refunded INTEGER DEFAULT 0,
      live_session_id TEXT,
      google_event_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (course_id) REFERENCES Courses(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES Users(id) ON DELETE CASCADE,
      FOREIGN KEY (teacher_id) REFERENCES Users(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS CreditWallets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      ai_balance INTEGER DEFAULT 0,
      live_class_balance INTEGER DEFAULT 0,
      self_study_balance INTEGER DEFAULT 0,
      lifetime_ai_credits INTEGER DEFAULT 0,
      lifetime_live_class_credits INTEGER DEFAULT 0,
      lifetime_self_study_credits INTEGER DEFAULT 0,
      subscription_id TEXT,
      credits_period TEXT DEFAULT 'none',
      period_start DATETIME,
      period_end DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS CreditLedger (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      change_amount INTEGER NOT NULL,
      balance_after INTEGER NOT NULL,
      credit_type TEXT NOT NULL DEFAULT 'ai' CHECK(credit_type IN ('ai', 'live_class', 'self_study')),
      reason TEXT NOT NULL,
      reference_type TEXT,
      reference_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS RateLimits (
      user_id TEXT NOT NULL,
      service TEXT NOT NULL DEFAULT 'ai',
      window_start DATETIME,
      window_used INTEGER DEFAULT 0,
      rate_limit INTEGER DEFAULT 0,
      PRIMARY KEY (user_id, service)
    );

CREATE TABLE IF NOT EXISTS Transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    amount INTEGER,
    amount_paise INTEGER,
    amount_inr INTEGER,
    currency TEXT DEFAULT 'INR',
    type TEXT NOT NULL,
    status TEXT NOT NULL,
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT UNIQUE,
    razorpay_signature TEXT,
    payment_source TEXT DEFAULT 'razorpay',
    related_id TEXT,
    credits_added INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ProcessedWebhookEvents (
    event_id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    razorpay_entity_id TEXT,
    processed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_processed_webhook_events_processed_at ON ProcessedWebhookEvents(processed_at);

CREATE TABLE IF NOT EXISTS CreditPlans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      credits INTEGER NOT NULL,
      price_inr INTEGER NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE IF NOT EXISTS Coupons (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT,
      discount_type TEXT CHECK(discount_type IN ('percent','fixed')) NOT NULL DEFAULT 'percent',
      discount_value INTEGER NOT NULL DEFAULT 0,
      max_discount_paise INTEGER DEFAULT 0,
      min_order_paise INTEGER DEFAULT 0,
      applies_to_json TEXT DEFAULT '["all"]',
      target_ids_json TEXT DEFAULT '[]',
      allowed_emails_json TEXT DEFAULT '[]',
      excluded_emails_json TEXT DEFAULT '[]',
      usage_limit INTEGER,
      per_user_limit INTEGER DEFAULT 1,
      starts_at DATETIME,
      ends_at DATETIME,
      is_active INTEGER DEFAULT 1,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE IF NOT EXISTS CouponRedemptions (
      id TEXT PRIMARY KEY,
      coupon_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      item_type TEXT NOT NULL,
      item_id TEXT,
      transaction_id TEXT,
      discount_paise INTEGER DEFAULT 0,
      status TEXT DEFAULT 'created',
      redeemed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (coupon_id) REFERENCES Coupons(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS BillingAddresses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      transaction_id TEXT,
      full_name TEXT,
      email TEXT,
      phone TEXT,
      line1 TEXT,
      line2 TEXT,
      city TEXT,
      state TEXT,
      pincode TEXT,
      country TEXT DEFAULT 'India',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS Books (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      price_inr INTEGER DEFAULT 0,
      price_usd INTEGER DEFAULT 0,
      thumbnail_url TEXT,
      is_standalone INTEGER DEFAULT 0,
      self_study_enabled INTEGER DEFAULT 0,
      self_study_credit_cost INTEGER DEFAULT 0,
      title_hi TEXT,
      description_hi TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE IF NOT EXISTS CourseBooks (
      course_id TEXT NOT NULL,
      book_id TEXT NOT NULL,
      order_index INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (course_id, book_id),
      FOREIGN KEY (course_id) REFERENCES Courses(id) ON DELETE CASCADE,
      FOREIGN KEY (book_id) REFERENCES Books(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS Badges (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT DEFAULT 'Trophy',
      xp_reward INTEGER DEFAULT 0,
      criteria_type TEXT NOT NULL,
      criteria_value INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE IF NOT EXISTS LeaveRequests (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      course_id TEXT,
      batch_id TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      reason TEXT NOT NULL,
      type TEXT CHECK(type IN ('sick', 'personal', 'other')) DEFAULT 'other',
      status TEXT CHECK(status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
      reviewed_by TEXT,
      reviewed_at TEXT,
      admin_notes TEXT,
      google_event_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES Users(id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES Courses(id) ON DELETE SET NULL,
      FOREIGN KEY (batch_id) REFERENCES Batches(id) ON DELETE SET NULL,
      FOREIGN KEY (reviewed_by) REFERENCES Users(id) ON DELETE SET NULL
    );

CREATE TABLE IF NOT EXISTS UserBadges (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      badge_id TEXT NOT NULL,
      earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
      FOREIGN KEY (badge_id) REFERENCES Badges(id) ON DELETE CASCADE,
      UNIQUE(user_id, badge_id)
    );

CREATE TABLE IF NOT EXISTS CourseMerchantListings (
      id TEXT PRIMARY KEY,
      course_id TEXT UNIQUE NOT NULL,
      sync_enabled INTEGER DEFAULT 1,
      offer_id TEXT,
      content_language TEXT,
      feed_label TEXT,
      target_country TEXT,
      currency TEXT,
      availability TEXT,
      condition TEXT,
      brand TEXT,
      google_product_category TEXT,
      image_url TEXT,
      landing_url TEXT,
      product_resource_name TEXT,
      data_source_name TEXT,
      sync_status TEXT DEFAULT 'not_synced',
      sync_error TEXT,
      last_synced_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (course_id) REFERENCES Courses(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS CreditPacks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      amount_inr INTEGER NOT NULL,
      credits INTEGER NOT NULL,
      credit_type TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE IF NOT EXISTS Subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      razorpay_subscription_id TEXT,
      razorpay_payment_link TEXT,
      status TEXT DEFAULT 'created',
      live_class_credits INTEGER DEFAULT 0,
      is_lifetime INTEGER DEFAULT 0,
      current_period_start TEXT,
      current_period_end TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
      FOREIGN KEY (plan_id) REFERENCES SubscriptionPlans(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS SubscriptionPlans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      interval TEXT NOT NULL,
      interval_count INTEGER DEFAULT 1,
      amount_inr INTEGER NOT NULL,
      razorpay_plan_id TEXT,
      course_access_type TEXT,
      max_course_selection INTEGER DEFAULT 0,
      batch_access_type TEXT,
      max_batch_selection INTEGER DEFAULT 0,
      book_access_type TEXT,
      max_book_selection INTEGER DEFAULT 0,
      ai_credits INTEGER DEFAULT 0,
      ai_credits_period TEXT,
      ai_rate_limit_per_hour INTEGER DEFAULT 0,
      live_session_access INTEGER DEFAULT 0,
      live_class_credits INTEGER DEFAULT 0,
      is_lifetime INTEGER DEFAULT 0,
      lifetime_price_inr INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE IF NOT EXISTS ReleaseCampaigns (
      id TEXT PRIMARY KEY,
      source_branch TEXT,
      target_branch TEXT,
      merge_sha TEXT,
      status TEXT,
      change_summary TEXT,
      email_subject TEXT,
      email_body TEXT,
      social_post TEXT,
      article_status TEXT DEFAULT 'coming_soon',
      social_platforms TEXT,
      scheduled_at DATETIME,
      email_sent_count INTEGER DEFAULT 0,
      social_result TEXT,
      admin_id TEXT,
      completed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (admin_id) REFERENCES Users(id) ON DELETE SET NULL
    );

CREATE TABLE IF NOT EXISTS UserSubscriptionSelections (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      subscription_id TEXT NOT NULL,
      item_type TEXT NOT NULL,
      item_id TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
      FOREIGN KEY (subscription_id) REFERENCES Subscriptions(id) ON DELETE CASCADE,
      UNIQUE(subscription_id, item_type, item_id)
    );

CREATE TABLE IF NOT EXISTS PlanContentPool (
      id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL,
      item_type TEXT NOT NULL,
      item_id TEXT NOT NULL,
      access_mode TEXT,
      bonus_ai_credits INTEGER DEFAULT 0,
      FOREIGN KEY (plan_id) REFERENCES SubscriptionPlans(id) ON DELETE CASCADE,
      UNIQUE(plan_id, item_type, item_id)
    );

CREATE TABLE IF NOT EXISTS AnonymousUsers (
      id TEXT PRIMARY KEY,
      device_id TEXT UNIQUE NOT NULL,
      first_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ip_address TEXT,
      user_agent TEXT,
      live_class_reminders_count INTEGER DEFAULT 0,
      live_class_reminders_reset_at DATETIME,
      broadcast_count INTEGER DEFAULT 0,
      broadcast_reset_at DATETIME,
      converted_to_user_id TEXT,
      converted_at DATETIME
    );

CREATE TABLE IF NOT EXISTS BroadcastLog (
      id TEXT PRIMARY KEY,
      sent_by TEXT,
      audience TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      data_json TEXT,
      sent_count INTEGER DEFAULT 0,
      failed_count INTEGER DEFAULT 0,
      skip_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sent_by) REFERENCES Users(id) ON DELETE SET NULL
    );

CREATE TABLE IF NOT EXISTS ScheduledNotifications (
      id TEXT PRIMARY KEY,
      created_by TEXT NOT NULL,
      title TEXT NOT NULL,
      title_hi TEXT,
      body TEXT NOT NULL,
      body_hi TEXT,
      audience TEXT NOT NULL,
      target_user_ids TEXT,
      data_json TEXT,
      schedule_type TEXT NOT NULL,
      scheduled_at DATETIME,
      time_of_day TEXT,
      days_of_week TEXT,
      days_of_month TEXT,
      timezone TEXT DEFAULT 'Asia/Kolkata',
      status TEXT DEFAULT 'pending',
      last_run_at DATETIME,
      next_run_at DATETIME,
      run_count INTEGER DEFAULT 0,
      max_runs INTEGER DEFAULT 100,
      expires_at DATETIME,
      result_log_id TEXT,
      last_error TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES Users(id) ON DELETE CASCADE,
      FOREIGN KEY (result_log_id) REFERENCES BroadcastLog(id) ON DELETE SET NULL
    );
CREATE TABLE IF NOT EXISTS MigrationHistory (
  id TEXT PRIMARY KEY,
  backup_url TEXT NOT NULL,
  logs TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS _migrations (
  id TEXT PRIMARY KEY,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS AccountDeletionRequests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      request_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      scheduled_deletion_date DATETIME NOT NULL,
      status TEXT CHECK(status IN ('pending', 'cancelled')) DEFAULT 'pending',
      FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS AiModels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  system_prompt TEXT,
  fallback_model_ids TEXT,
  is_active INTEGER DEFAULT 1,
  is_default INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
