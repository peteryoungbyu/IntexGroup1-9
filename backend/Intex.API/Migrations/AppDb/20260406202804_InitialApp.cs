using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Intex.API.Migrations.AppDb
{
    /// <inheritdoc />
    public partial class InitialApp : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "partners",
                columns: table => new
                {
                    PartnerId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    PartnerName = table.Column<string>(type: "TEXT", nullable: false),
                    PartnerType = table.Column<string>(type: "TEXT", nullable: false),
                    RoleType = table.Column<string>(type: "TEXT", nullable: false),
                    ContactName = table.Column<string>(type: "TEXT", nullable: true),
                    Email = table.Column<string>(type: "TEXT", nullable: true),
                    Phone = table.Column<string>(type: "TEXT", nullable: true),
                    Region = table.Column<string>(type: "TEXT", nullable: true),
                    Status = table.Column<string>(type: "TEXT", nullable: false),
                    StartDate = table.Column<DateOnly>(type: "TEXT", nullable: true),
                    EndDate = table.Column<DateOnly>(type: "TEXT", nullable: true),
                    Notes = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_partners", x => x.PartnerId);
                });

            migrationBuilder.CreateTable(
                name: "public_impact_snapshots",
                columns: table => new
                {
                    SnapshotId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    SnapshotDate = table.Column<DateOnly>(type: "TEXT", nullable: false),
                    Headline = table.Column<string>(type: "TEXT", nullable: false),
                    SummaryText = table.Column<string>(type: "TEXT", nullable: false),
                    MetricPayloadJson = table.Column<string>(type: "TEXT", nullable: true),
                    IsPublished = table.Column<bool>(type: "INTEGER", nullable: false),
                    PublishedAt = table.Column<DateOnly>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_public_impact_snapshots", x => x.SnapshotId);
                });

            migrationBuilder.CreateTable(
                name: "safehouses",
                columns: table => new
                {
                    SafehouseId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    SafehouseCode = table.Column<string>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    Region = table.Column<string>(type: "TEXT", nullable: false),
                    City = table.Column<string>(type: "TEXT", nullable: false),
                    Province = table.Column<string>(type: "TEXT", nullable: false),
                    Country = table.Column<string>(type: "TEXT", nullable: false),
                    OpenDate = table.Column<DateOnly>(type: "TEXT", nullable: false),
                    Status = table.Column<string>(type: "TEXT", nullable: false),
                    CapacityGirls = table.Column<int>(type: "INTEGER", nullable: false),
                    CapacityStaff = table.Column<int>(type: "INTEGER", nullable: false),
                    CurrentOccupancy = table.Column<int>(type: "INTEGER", nullable: false),
                    Notes = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_safehouses", x => x.SafehouseId);
                });

            migrationBuilder.CreateTable(
                name: "social_media_posts",
                columns: table => new
                {
                    PostId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Platform = table.Column<string>(type: "TEXT", nullable: false),
                    PlatformPostId = table.Column<string>(type: "TEXT", nullable: true),
                    PostUrl = table.Column<string>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    DayOfWeek = table.Column<string>(type: "TEXT", nullable: true),
                    PostHour = table.Column<int>(type: "INTEGER", nullable: true),
                    PostType = table.Column<string>(type: "TEXT", nullable: false),
                    MediaType = table.Column<string>(type: "TEXT", nullable: true),
                    Caption = table.Column<string>(type: "TEXT", nullable: true),
                    Hashtags = table.Column<string>(type: "TEXT", nullable: true),
                    NumHashtags = table.Column<int>(type: "INTEGER", nullable: false),
                    MentionsCount = table.Column<int>(type: "INTEGER", nullable: false),
                    HasCallToAction = table.Column<bool>(type: "INTEGER", nullable: false),
                    CallToActionType = table.Column<string>(type: "TEXT", nullable: true),
                    ContentTopic = table.Column<string>(type: "TEXT", nullable: true),
                    SentimentTone = table.Column<string>(type: "TEXT", nullable: true),
                    CaptionLength = table.Column<int>(type: "INTEGER", nullable: false),
                    FeaturesResidentStory = table.Column<bool>(type: "INTEGER", nullable: false),
                    CampaignName = table.Column<string>(type: "TEXT", nullable: true),
                    IsBoosted = table.Column<bool>(type: "INTEGER", nullable: false),
                    BoostBudgetPhp = table.Column<decimal>(type: "TEXT", precision: 12, scale: 2, nullable: true),
                    Impressions = table.Column<int>(type: "INTEGER", nullable: false),
                    Reach = table.Column<int>(type: "INTEGER", nullable: false),
                    Likes = table.Column<int>(type: "INTEGER", nullable: false),
                    Comments = table.Column<int>(type: "INTEGER", nullable: false),
                    Shares = table.Column<int>(type: "INTEGER", nullable: false),
                    Saves = table.Column<int>(type: "INTEGER", nullable: false),
                    ClickThroughs = table.Column<int>(type: "INTEGER", nullable: false),
                    VideoViews = table.Column<int>(type: "INTEGER", nullable: true),
                    EngagementRate = table.Column<decimal>(type: "TEXT", precision: 6, scale: 4, nullable: false),
                    ProfileVisits = table.Column<int>(type: "INTEGER", nullable: false),
                    DonationReferrals = table.Column<int>(type: "INTEGER", nullable: false),
                    EstimatedDonationValuePhp = table.Column<decimal>(type: "TEXT", precision: 12, scale: 2, nullable: false),
                    FollowerCountAtPost = table.Column<int>(type: "INTEGER", nullable: false),
                    WatchTimeSeconds = table.Column<int>(type: "INTEGER", nullable: true),
                    AvgViewDurationSeconds = table.Column<int>(type: "INTEGER", nullable: true),
                    SubscriberCountAtPost = table.Column<int>(type: "INTEGER", nullable: true),
                    Forwards = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_social_media_posts", x => x.PostId);
                });

            migrationBuilder.CreateTable(
                name: "supporters",
                columns: table => new
                {
                    SupporterId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    SupporterType = table.Column<string>(type: "TEXT", nullable: false),
                    DisplayName = table.Column<string>(type: "TEXT", nullable: false),
                    OrganizationName = table.Column<string>(type: "TEXT", nullable: true),
                    FirstName = table.Column<string>(type: "TEXT", nullable: true),
                    LastName = table.Column<string>(type: "TEXT", nullable: true),
                    RelationshipType = table.Column<string>(type: "TEXT", nullable: true),
                    Region = table.Column<string>(type: "TEXT", nullable: true),
                    Country = table.Column<string>(type: "TEXT", nullable: true),
                    Email = table.Column<string>(type: "TEXT", nullable: true),
                    Phone = table.Column<string>(type: "TEXT", nullable: true),
                    Status = table.Column<string>(type: "TEXT", nullable: false),
                    FirstDonationDate = table.Column<DateOnly>(type: "TEXT", nullable: true),
                    AcquisitionChannel = table.Column<string>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_supporters", x => x.SupporterId);
                });

            migrationBuilder.CreateTable(
                name: "partner_assignments",
                columns: table => new
                {
                    AssignmentId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    PartnerId = table.Column<int>(type: "INTEGER", nullable: false),
                    SafehouseId = table.Column<int>(type: "INTEGER", nullable: true),
                    ProgramArea = table.Column<string>(type: "TEXT", nullable: false),
                    AssignmentStart = table.Column<DateOnly>(type: "TEXT", nullable: false),
                    AssignmentEnd = table.Column<DateOnly>(type: "TEXT", nullable: true),
                    ResponsibilityNotes = table.Column<string>(type: "TEXT", nullable: true),
                    IsPrimary = table.Column<bool>(type: "INTEGER", nullable: false),
                    Status = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_partner_assignments", x => x.AssignmentId);
                    table.ForeignKey(
                        name: "FK_partner_assignments_partners_PartnerId",
                        column: x => x.PartnerId,
                        principalTable: "partners",
                        principalColumn: "PartnerId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_partner_assignments_safehouses_SafehouseId",
                        column: x => x.SafehouseId,
                        principalTable: "safehouses",
                        principalColumn: "SafehouseId");
                });

            migrationBuilder.CreateTable(
                name: "residents",
                columns: table => new
                {
                    ResidentId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    CaseControlNo = table.Column<string>(type: "TEXT", nullable: false),
                    InternalCode = table.Column<string>(type: "TEXT", nullable: false),
                    SafehouseId = table.Column<int>(type: "INTEGER", nullable: false),
                    CaseStatus = table.Column<string>(type: "TEXT", nullable: false),
                    Sex = table.Column<string>(type: "TEXT", nullable: false),
                    DateOfBirth = table.Column<DateOnly>(type: "TEXT", nullable: false),
                    BirthStatus = table.Column<string>(type: "TEXT", nullable: true),
                    PlaceOfBirth = table.Column<string>(type: "TEXT", nullable: true),
                    Religion = table.Column<string>(type: "TEXT", nullable: true),
                    CaseCategory = table.Column<string>(type: "TEXT", nullable: false),
                    SubCatOrphaned = table.Column<bool>(type: "INTEGER", nullable: false),
                    SubCatTrafficked = table.Column<bool>(type: "INTEGER", nullable: false),
                    SubCatChildLabor = table.Column<bool>(type: "INTEGER", nullable: false),
                    SubCatPhysicalAbuse = table.Column<bool>(type: "INTEGER", nullable: false),
                    SubCatSexualAbuse = table.Column<bool>(type: "INTEGER", nullable: false),
                    SubCatOsaec = table.Column<bool>(type: "INTEGER", nullable: false),
                    SubCatCicl = table.Column<bool>(type: "INTEGER", nullable: false),
                    SubCatAtRisk = table.Column<bool>(type: "INTEGER", nullable: false),
                    SubCatStreetChild = table.Column<bool>(type: "INTEGER", nullable: false),
                    SubCatChildWithHiv = table.Column<bool>(type: "INTEGER", nullable: false),
                    IsPwd = table.Column<bool>(type: "INTEGER", nullable: false),
                    PwdType = table.Column<string>(type: "TEXT", nullable: true),
                    HasSpecialNeeds = table.Column<bool>(type: "INTEGER", nullable: false),
                    SpecialNeedsDiagnosis = table.Column<string>(type: "TEXT", nullable: true),
                    FamilyIs4Ps = table.Column<bool>(type: "INTEGER", nullable: false),
                    FamilySoloParent = table.Column<bool>(type: "INTEGER", nullable: false),
                    FamilyIndigenous = table.Column<bool>(type: "INTEGER", nullable: false),
                    FamilyParentPwd = table.Column<bool>(type: "INTEGER", nullable: false),
                    FamilyInformalSettler = table.Column<bool>(type: "INTEGER", nullable: false),
                    DateOfAdmission = table.Column<DateOnly>(type: "TEXT", nullable: false),
                    AgeUponAdmission = table.Column<string>(type: "TEXT", nullable: true),
                    PresentAge = table.Column<string>(type: "TEXT", nullable: true),
                    LengthOfStay = table.Column<string>(type: "TEXT", nullable: true),
                    ReferralSource = table.Column<string>(type: "TEXT", nullable: true),
                    ReferringAgencyPerson = table.Column<string>(type: "TEXT", nullable: true),
                    DateColbRegistered = table.Column<DateOnly>(type: "TEXT", nullable: true),
                    DateColbObtained = table.Column<DateOnly>(type: "TEXT", nullable: true),
                    AssignedSocialWorker = table.Column<string>(type: "TEXT", nullable: true),
                    InitialCaseAssessment = table.Column<string>(type: "TEXT", nullable: true),
                    DateCaseStudyPrepared = table.Column<DateOnly>(type: "TEXT", nullable: true),
                    ReintegrationType = table.Column<string>(type: "TEXT", nullable: true),
                    ReintegrationStatus = table.Column<string>(type: "TEXT", nullable: true),
                    InitialRiskLevel = table.Column<string>(type: "TEXT", nullable: true),
                    CurrentRiskLevel = table.Column<string>(type: "TEXT", nullable: true),
                    DateEnrolled = table.Column<DateOnly>(type: "TEXT", nullable: true),
                    DateClosed = table.Column<DateOnly>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    NotesRestricted = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_residents", x => x.ResidentId);
                    table.ForeignKey(
                        name: "FK_residents_safehouses_SafehouseId",
                        column: x => x.SafehouseId,
                        principalTable: "safehouses",
                        principalColumn: "SafehouseId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "safehouse_monthly_metrics",
                columns: table => new
                {
                    MetricId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    SafehouseId = table.Column<int>(type: "INTEGER", nullable: false),
                    MonthStart = table.Column<DateOnly>(type: "TEXT", nullable: false),
                    MonthEnd = table.Column<DateOnly>(type: "TEXT", nullable: false),
                    ActiveResidents = table.Column<int>(type: "INTEGER", nullable: false),
                    AvgEducationProgress = table.Column<decimal>(type: "TEXT", precision: 5, scale: 2, nullable: false),
                    AvgHealthScore = table.Column<decimal>(type: "TEXT", precision: 3, scale: 1, nullable: false),
                    ProcessRecordingCount = table.Column<int>(type: "INTEGER", nullable: false),
                    HomeVisitationCount = table.Column<int>(type: "INTEGER", nullable: false),
                    IncidentCount = table.Column<int>(type: "INTEGER", nullable: false),
                    Notes = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_safehouse_monthly_metrics", x => x.MetricId);
                    table.ForeignKey(
                        name: "FK_safehouse_monthly_metrics_safehouses_SafehouseId",
                        column: x => x.SafehouseId,
                        principalTable: "safehouses",
                        principalColumn: "SafehouseId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "donations",
                columns: table => new
                {
                    DonationId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    SupporterId = table.Column<int>(type: "INTEGER", nullable: false),
                    DonationType = table.Column<string>(type: "TEXT", nullable: false),
                    DonationDate = table.Column<DateOnly>(type: "TEXT", nullable: false),
                    ChannelSource = table.Column<string>(type: "TEXT", nullable: true),
                    CurrencyCode = table.Column<string>(type: "TEXT", nullable: true),
                    Amount = table.Column<decimal>(type: "TEXT", precision: 14, scale: 2, nullable: true),
                    EstimatedValue = table.Column<decimal>(type: "TEXT", precision: 14, scale: 2, nullable: true),
                    ImpactUnit = table.Column<string>(type: "TEXT", nullable: true),
                    IsRecurring = table.Column<bool>(type: "INTEGER", nullable: false),
                    CampaignName = table.Column<string>(type: "TEXT", nullable: true),
                    Notes = table.Column<string>(type: "TEXT", nullable: true),
                    CreatedByPartnerId = table.Column<int>(type: "INTEGER", nullable: true),
                    ReferralPostId = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_donations", x => x.DonationId);
                    table.ForeignKey(
                        name: "FK_donations_partners_CreatedByPartnerId",
                        column: x => x.CreatedByPartnerId,
                        principalTable: "partners",
                        principalColumn: "PartnerId");
                    table.ForeignKey(
                        name: "FK_donations_social_media_posts_ReferralPostId",
                        column: x => x.ReferralPostId,
                        principalTable: "social_media_posts",
                        principalColumn: "PostId");
                    table.ForeignKey(
                        name: "FK_donations_supporters_SupporterId",
                        column: x => x.SupporterId,
                        principalTable: "supporters",
                        principalColumn: "SupporterId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "supporter_user_links",
                columns: table => new
                {
                    LinkId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    SupporterId = table.Column<int>(type: "INTEGER", nullable: false),
                    UserId = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_supporter_user_links", x => x.LinkId);
                    table.ForeignKey(
                        name: "FK_supporter_user_links_supporters_SupporterId",
                        column: x => x.SupporterId,
                        principalTable: "supporters",
                        principalColumn: "SupporterId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "case_conferences",
                columns: table => new
                {
                    ConferenceId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ResidentId = table.Column<int>(type: "INTEGER", nullable: false),
                    ConferenceDate = table.Column<DateOnly>(type: "TEXT", nullable: false),
                    FacilitatedBy = table.Column<string>(type: "TEXT", nullable: false),
                    Attendees = table.Column<string>(type: "TEXT", nullable: false),
                    Agenda = table.Column<string>(type: "TEXT", nullable: false),
                    Decisions = table.Column<string>(type: "TEXT", nullable: true),
                    NextSteps = table.Column<string>(type: "TEXT", nullable: true),
                    NextReviewDate = table.Column<DateOnly>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_case_conferences", x => x.ConferenceId);
                    table.ForeignKey(
                        name: "FK_case_conferences_residents_ResidentId",
                        column: x => x.ResidentId,
                        principalTable: "residents",
                        principalColumn: "ResidentId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "education_records",
                columns: table => new
                {
                    EducationRecordId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ResidentId = table.Column<int>(type: "INTEGER", nullable: false),
                    RecordDate = table.Column<DateOnly>(type: "TEXT", nullable: false),
                    ProgramName = table.Column<string>(type: "TEXT", nullable: false),
                    CourseName = table.Column<string>(type: "TEXT", nullable: false),
                    EducationLevel = table.Column<string>(type: "TEXT", nullable: false),
                    AttendanceStatus = table.Column<string>(type: "TEXT", nullable: false),
                    AttendanceRate = table.Column<decimal>(type: "TEXT", precision: 4, scale: 2, nullable: false),
                    ProgressPercent = table.Column<decimal>(type: "TEXT", precision: 5, scale: 2, nullable: false),
                    CompletionStatus = table.Column<string>(type: "TEXT", nullable: false),
                    GpaLikeScore = table.Column<decimal>(type: "TEXT", precision: 3, scale: 1, nullable: false),
                    Notes = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_education_records", x => x.EducationRecordId);
                    table.ForeignKey(
                        name: "FK_education_records_residents_ResidentId",
                        column: x => x.ResidentId,
                        principalTable: "residents",
                        principalColumn: "ResidentId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "health_wellbeing_records",
                columns: table => new
                {
                    HealthRecordId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ResidentId = table.Column<int>(type: "INTEGER", nullable: false),
                    RecordDate = table.Column<DateOnly>(type: "TEXT", nullable: false),
                    WeightKg = table.Column<decimal>(type: "TEXT", precision: 5, scale: 2, nullable: true),
                    HeightCm = table.Column<decimal>(type: "TEXT", precision: 5, scale: 2, nullable: true),
                    Bmi = table.Column<decimal>(type: "TEXT", precision: 5, scale: 2, nullable: true),
                    NutritionScore = table.Column<decimal>(type: "TEXT", precision: 3, scale: 1, nullable: true),
                    SleepScore = table.Column<decimal>(type: "TEXT", precision: 3, scale: 1, nullable: true),
                    EnergyScore = table.Column<decimal>(type: "TEXT", precision: 3, scale: 1, nullable: true),
                    GeneralHealthScore = table.Column<decimal>(type: "TEXT", precision: 3, scale: 1, nullable: true),
                    MedicalCheckupDone = table.Column<bool>(type: "INTEGER", nullable: false),
                    DentalCheckupDone = table.Column<bool>(type: "INTEGER", nullable: false),
                    PsychologicalCheckupDone = table.Column<bool>(type: "INTEGER", nullable: false),
                    MedicalNotesRestricted = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_health_wellbeing_records", x => x.HealthRecordId);
                    table.ForeignKey(
                        name: "FK_health_wellbeing_records_residents_ResidentId",
                        column: x => x.ResidentId,
                        principalTable: "residents",
                        principalColumn: "ResidentId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "home_visitations",
                columns: table => new
                {
                    VisitationId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ResidentId = table.Column<int>(type: "INTEGER", nullable: false),
                    VisitDate = table.Column<DateOnly>(type: "TEXT", nullable: false),
                    SocialWorker = table.Column<string>(type: "TEXT", nullable: false),
                    VisitType = table.Column<string>(type: "TEXT", nullable: false),
                    LocationVisited = table.Column<string>(type: "TEXT", nullable: true),
                    FamilyMembersPresent = table.Column<string>(type: "TEXT", nullable: true),
                    Purpose = table.Column<string>(type: "TEXT", nullable: true),
                    Observations = table.Column<string>(type: "TEXT", nullable: true),
                    FamilyCooperationLevel = table.Column<string>(type: "TEXT", nullable: true),
                    SafetyConcernsNoted = table.Column<bool>(type: "INTEGER", nullable: false),
                    FollowUpNeeded = table.Column<bool>(type: "INTEGER", nullable: false),
                    FollowUpNotes = table.Column<string>(type: "TEXT", nullable: true),
                    VisitOutcome = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_home_visitations", x => x.VisitationId);
                    table.ForeignKey(
                        name: "FK_home_visitations_residents_ResidentId",
                        column: x => x.ResidentId,
                        principalTable: "residents",
                        principalColumn: "ResidentId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "incident_reports",
                columns: table => new
                {
                    IncidentId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ResidentId = table.Column<int>(type: "INTEGER", nullable: false),
                    SafehouseId = table.Column<int>(type: "INTEGER", nullable: false),
                    IncidentDate = table.Column<DateOnly>(type: "TEXT", nullable: false),
                    IncidentType = table.Column<string>(type: "TEXT", nullable: false),
                    Severity = table.Column<string>(type: "TEXT", nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: false),
                    ResponseTaken = table.Column<string>(type: "TEXT", nullable: true),
                    Resolved = table.Column<bool>(type: "INTEGER", nullable: false),
                    ResolutionDate = table.Column<DateOnly>(type: "TEXT", nullable: true),
                    ReportedBy = table.Column<string>(type: "TEXT", nullable: false),
                    FollowUpRequired = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_incident_reports", x => x.IncidentId);
                    table.ForeignKey(
                        name: "FK_incident_reports_residents_ResidentId",
                        column: x => x.ResidentId,
                        principalTable: "residents",
                        principalColumn: "ResidentId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_incident_reports_safehouses_SafehouseId",
                        column: x => x.SafehouseId,
                        principalTable: "safehouses",
                        principalColumn: "SafehouseId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "intervention_plans",
                columns: table => new
                {
                    PlanId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ResidentId = table.Column<int>(type: "INTEGER", nullable: false),
                    PlanCategory = table.Column<string>(type: "TEXT", nullable: false),
                    PlanDescription = table.Column<string>(type: "TEXT", nullable: false),
                    ServicesProvided = table.Column<string>(type: "TEXT", nullable: true),
                    TargetValue = table.Column<decimal>(type: "TEXT", nullable: true),
                    TargetDate = table.Column<DateOnly>(type: "TEXT", nullable: true),
                    Status = table.Column<string>(type: "TEXT", nullable: false),
                    CaseConferenceDate = table.Column<DateOnly>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_intervention_plans", x => x.PlanId);
                    table.ForeignKey(
                        name: "FK_intervention_plans_residents_ResidentId",
                        column: x => x.ResidentId,
                        principalTable: "residents",
                        principalColumn: "ResidentId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "prediction_results",
                columns: table => new
                {
                    PredictionId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ResidentId = table.Column<int>(type: "INTEGER", nullable: true),
                    SupporterId = table.Column<int>(type: "INTEGER", nullable: true),
                    ModelName = table.Column<string>(type: "TEXT", nullable: false),
                    Score = table.Column<decimal>(type: "TEXT", precision: 6, scale: 4, nullable: false),
                    Label = table.Column<string>(type: "TEXT", nullable: true),
                    FeatureImportanceJson = table.Column<string>(type: "TEXT", nullable: true),
                    GeneratedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_prediction_results", x => x.PredictionId);
                    table.ForeignKey(
                        name: "FK_prediction_results_residents_ResidentId",
                        column: x => x.ResidentId,
                        principalTable: "residents",
                        principalColumn: "ResidentId");
                    table.ForeignKey(
                        name: "FK_prediction_results_supporters_SupporterId",
                        column: x => x.SupporterId,
                        principalTable: "supporters",
                        principalColumn: "SupporterId");
                });

            migrationBuilder.CreateTable(
                name: "process_recordings",
                columns: table => new
                {
                    RecordingId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ResidentId = table.Column<int>(type: "INTEGER", nullable: false),
                    SessionDate = table.Column<DateOnly>(type: "TEXT", nullable: false),
                    SocialWorker = table.Column<string>(type: "TEXT", nullable: false),
                    SessionType = table.Column<string>(type: "TEXT", nullable: false),
                    SessionDurationMinutes = table.Column<int>(type: "INTEGER", nullable: false),
                    EmotionalStateObserved = table.Column<string>(type: "TEXT", nullable: true),
                    EmotionalStateEnd = table.Column<string>(type: "TEXT", nullable: true),
                    SessionNarrative = table.Column<string>(type: "TEXT", nullable: true),
                    InterventionsApplied = table.Column<string>(type: "TEXT", nullable: true),
                    FollowUpActions = table.Column<string>(type: "TEXT", nullable: true),
                    ProgressNoted = table.Column<bool>(type: "INTEGER", nullable: false),
                    ConcernsFlagged = table.Column<bool>(type: "INTEGER", nullable: false),
                    ReferralMade = table.Column<bool>(type: "INTEGER", nullable: false),
                    NotesRestricted = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_process_recordings", x => x.RecordingId);
                    table.ForeignKey(
                        name: "FK_process_recordings_residents_ResidentId",
                        column: x => x.ResidentId,
                        principalTable: "residents",
                        principalColumn: "ResidentId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "donation_allocations",
                columns: table => new
                {
                    AllocationId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    DonationId = table.Column<int>(type: "INTEGER", nullable: false),
                    SafehouseId = table.Column<int>(type: "INTEGER", nullable: false),
                    ProgramArea = table.Column<string>(type: "TEXT", nullable: false),
                    AmountAllocated = table.Column<decimal>(type: "TEXT", precision: 14, scale: 2, nullable: false),
                    AllocationDate = table.Column<DateOnly>(type: "TEXT", nullable: false),
                    AllocationNotes = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_donation_allocations", x => x.AllocationId);
                    table.ForeignKey(
                        name: "FK_donation_allocations_donations_DonationId",
                        column: x => x.DonationId,
                        principalTable: "donations",
                        principalColumn: "DonationId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_donation_allocations_safehouses_SafehouseId",
                        column: x => x.SafehouseId,
                        principalTable: "safehouses",
                        principalColumn: "SafehouseId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "in_kind_donation_items",
                columns: table => new
                {
                    ItemId = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    DonationId = table.Column<int>(type: "INTEGER", nullable: false),
                    ItemName = table.Column<string>(type: "TEXT", nullable: false),
                    ItemCategory = table.Column<string>(type: "TEXT", nullable: false),
                    Quantity = table.Column<int>(type: "INTEGER", nullable: false),
                    UnitOfMeasure = table.Column<string>(type: "TEXT", nullable: false),
                    EstimatedUnitValue = table.Column<decimal>(type: "TEXT", precision: 14, scale: 2, nullable: false),
                    IntendedUse = table.Column<string>(type: "TEXT", nullable: true),
                    ReceivedCondition = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_in_kind_donation_items", x => x.ItemId);
                    table.ForeignKey(
                        name: "FK_in_kind_donation_items_donations_DonationId",
                        column: x => x.DonationId,
                        principalTable: "donations",
                        principalColumn: "DonationId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_case_conferences_ResidentId",
                table: "case_conferences",
                column: "ResidentId");

            migrationBuilder.CreateIndex(
                name: "IX_donation_allocations_DonationId",
                table: "donation_allocations",
                column: "DonationId");

            migrationBuilder.CreateIndex(
                name: "IX_donation_allocations_SafehouseId",
                table: "donation_allocations",
                column: "SafehouseId");

            migrationBuilder.CreateIndex(
                name: "IX_donations_CreatedByPartnerId",
                table: "donations",
                column: "CreatedByPartnerId");

            migrationBuilder.CreateIndex(
                name: "IX_donations_ReferralPostId",
                table: "donations",
                column: "ReferralPostId");

            migrationBuilder.CreateIndex(
                name: "IX_donations_SupporterId",
                table: "donations",
                column: "SupporterId");

            migrationBuilder.CreateIndex(
                name: "IX_education_records_ResidentId",
                table: "education_records",
                column: "ResidentId");

            migrationBuilder.CreateIndex(
                name: "IX_health_wellbeing_records_ResidentId",
                table: "health_wellbeing_records",
                column: "ResidentId");

            migrationBuilder.CreateIndex(
                name: "IX_home_visitations_ResidentId",
                table: "home_visitations",
                column: "ResidentId");

            migrationBuilder.CreateIndex(
                name: "IX_in_kind_donation_items_DonationId",
                table: "in_kind_donation_items",
                column: "DonationId");

            migrationBuilder.CreateIndex(
                name: "IX_incident_reports_ResidentId",
                table: "incident_reports",
                column: "ResidentId");

            migrationBuilder.CreateIndex(
                name: "IX_incident_reports_SafehouseId",
                table: "incident_reports",
                column: "SafehouseId");

            migrationBuilder.CreateIndex(
                name: "IX_intervention_plans_ResidentId",
                table: "intervention_plans",
                column: "ResidentId");

            migrationBuilder.CreateIndex(
                name: "IX_partner_assignments_PartnerId",
                table: "partner_assignments",
                column: "PartnerId");

            migrationBuilder.CreateIndex(
                name: "IX_partner_assignments_SafehouseId",
                table: "partner_assignments",
                column: "SafehouseId");

            migrationBuilder.CreateIndex(
                name: "IX_prediction_results_ResidentId",
                table: "prediction_results",
                column: "ResidentId");

            migrationBuilder.CreateIndex(
                name: "IX_prediction_results_SupporterId",
                table: "prediction_results",
                column: "SupporterId");

            migrationBuilder.CreateIndex(
                name: "IX_process_recordings_ResidentId",
                table: "process_recordings",
                column: "ResidentId");

            migrationBuilder.CreateIndex(
                name: "IX_residents_CaseControlNo",
                table: "residents",
                column: "CaseControlNo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_residents_SafehouseId",
                table: "residents",
                column: "SafehouseId");

            migrationBuilder.CreateIndex(
                name: "IX_safehouse_monthly_metrics_SafehouseId",
                table: "safehouse_monthly_metrics",
                column: "SafehouseId");

            migrationBuilder.CreateIndex(
                name: "IX_supporter_user_links_SupporterId_UserId",
                table: "supporter_user_links",
                columns: new[] { "SupporterId", "UserId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "case_conferences");

            migrationBuilder.DropTable(
                name: "donation_allocations");

            migrationBuilder.DropTable(
                name: "education_records");

            migrationBuilder.DropTable(
                name: "health_wellbeing_records");

            migrationBuilder.DropTable(
                name: "home_visitations");

            migrationBuilder.DropTable(
                name: "in_kind_donation_items");

            migrationBuilder.DropTable(
                name: "incident_reports");

            migrationBuilder.DropTable(
                name: "intervention_plans");

            migrationBuilder.DropTable(
                name: "partner_assignments");

            migrationBuilder.DropTable(
                name: "prediction_results");

            migrationBuilder.DropTable(
                name: "process_recordings");

            migrationBuilder.DropTable(
                name: "public_impact_snapshots");

            migrationBuilder.DropTable(
                name: "safehouse_monthly_metrics");

            migrationBuilder.DropTable(
                name: "supporter_user_links");

            migrationBuilder.DropTable(
                name: "donations");

            migrationBuilder.DropTable(
                name: "residents");

            migrationBuilder.DropTable(
                name: "partners");

            migrationBuilder.DropTable(
                name: "social_media_posts");

            migrationBuilder.DropTable(
                name: "supporters");

            migrationBuilder.DropTable(
                name: "safehouses");
        }
    }
}
