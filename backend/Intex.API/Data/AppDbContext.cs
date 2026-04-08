using Intex.API.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using System.Text;

namespace Intex.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Safehouse> Safehouses => Set<Safehouse>();
    public DbSet<Partner> Partners => Set<Partner>();
    public DbSet<PartnerAssignment> PartnerAssignments => Set<PartnerAssignment>();
    public DbSet<Supporter> Supporters => Set<Supporter>();
    public DbSet<Donation> Donations => Set<Donation>();
    public DbSet<InKindDonationItem> InKindDonationItems => Set<InKindDonationItem>();
    public DbSet<DonationAllocation> DonationAllocations => Set<DonationAllocation>();
    public DbSet<Resident> Residents => Set<Resident>();
    public DbSet<ProcessRecording> ProcessRecordings => Set<ProcessRecording>();
    public DbSet<HomeVisitation> HomeVisitations => Set<HomeVisitation>();
    public DbSet<EducationRecord> EducationRecords => Set<EducationRecord>();
    public DbSet<HealthWellbeingRecord> HealthWellbeingRecords => Set<HealthWellbeingRecord>();
    public DbSet<InterventionPlan> InterventionPlans => Set<InterventionPlan>();
    public DbSet<IncidentReport> IncidentReports => Set<IncidentReport>();
    public DbSet<SocialMediaPost> SocialMediaPosts => Set<SocialMediaPost>();
    public DbSet<SafehouseMonthlyMetric> SafehouseMonthlyMetrics => Set<SafehouseMonthlyMetric>();
    public DbSet<PublicImpactSnapshot> PublicImpactSnapshots => Set<PublicImpactSnapshot>();
    public DbSet<CaseConference> CaseConferences => Set<CaseConference>();
    public DbSet<SupporterUserLink> SupporterUserLinks => Set<SupporterUserLink>();
    public DbSet<PredictionResult> PredictionResults => Set<PredictionResult>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // snake_case table names to match data dictionary; explicit HasKey for non-standard PK names
        modelBuilder.Entity<Safehouse>().ToTable("safehouses");
        modelBuilder.Entity<Partner>().ToTable("partners");
        modelBuilder.Entity<PartnerAssignment>().ToTable("partner_assignments").HasKey(e => e.AssignmentId);
        modelBuilder.Entity<Supporter>().ToTable("supporters");
        modelBuilder.Entity<Donation>().ToTable("donations");
        modelBuilder.Entity<InKindDonationItem>().ToTable("in_kind_donation_items").HasKey(e => e.ItemId);
        modelBuilder.Entity<DonationAllocation>().ToTable("donation_allocations").HasKey(e => e.AllocationId);
        modelBuilder.Entity<Resident>().ToTable("residents");
        modelBuilder.Entity<ProcessRecording>().ToTable("process_recordings").HasKey(e => e.RecordingId);
        modelBuilder.Entity<HomeVisitation>().ToTable("home_visitations").HasKey(e => e.VisitationId);
        modelBuilder.Entity<EducationRecord>().ToTable("education_records");
        modelBuilder.Entity<HealthWellbeingRecord>().ToTable("health_wellbeing_records").HasKey(e => e.HealthRecordId);
        modelBuilder.Entity<InterventionPlan>().ToTable("intervention_plans").HasKey(e => e.PlanId);
        modelBuilder.Entity<IncidentReport>().ToTable("incident_reports").HasKey(e => e.IncidentId);
        modelBuilder.Entity<SocialMediaPost>().ToTable("social_media_posts").HasKey(e => e.PostId);
        modelBuilder.Entity<SafehouseMonthlyMetric>().ToTable("safehouse_monthly_metrics").HasKey(e => e.MetricId);
        modelBuilder.Entity<PublicImpactSnapshot>().ToTable("public_impact_snapshots").HasKey(e => e.SnapshotId);
        modelBuilder.Entity<CaseConference>().ToTable("case_conferences").HasKey(e => e.ConferenceId);
        modelBuilder.Entity<SupporterUserLink>().ToTable("supporter_user_links").HasKey(e => e.LinkId);
        modelBuilder.Entity<PredictionResult>().ToTable("prediction_results").HasKey(e => e.PredictionId);

        // Decimal precision
        modelBuilder.Entity<Donation>(e =>
        {
            e.Property(d => d.Amount).HasPrecision(14, 2);
            e.Property(d => d.EstimatedValue).HasPrecision(14, 2);
        });

        modelBuilder.Entity<InKindDonationItem>(e =>
            e.Property(i => i.EstimatedUnitValue).HasPrecision(14, 2));

        modelBuilder.Entity<DonationAllocation>(e =>
            e.Property(a => a.AmountAllocated).HasPrecision(14, 2));

        modelBuilder.Entity<SocialMediaPost>(e =>
        {
            e.Property(p => p.EngagementRate).HasPrecision(6, 4);
            e.Property(p => p.BoostBudgetPhp).HasPrecision(12, 2);
            e.Property(p => p.EstimatedDonationValuePhp).HasPrecision(12, 2);
        });

        modelBuilder.Entity<EducationRecord>(e =>
        {
            e.Property(r => r.AttendanceRate).HasPrecision(4, 2);
            e.Property(r => r.ProgressPercent).HasPrecision(5, 2);
        });

        modelBuilder.Entity<HealthWellbeingRecord>(e =>
        {
            e.Property(r => r.WeightKg).HasPrecision(5, 2);
            e.Property(r => r.HeightCm).HasPrecision(5, 2);
            e.Property(r => r.Bmi).HasPrecision(5, 2);
            e.Property(r => r.NutritionScore).HasPrecision(3, 1);
            e.Property(r => r.SleepScore).HasPrecision(3, 1);
            e.Property(r => r.EnergyScore).HasPrecision(3, 1);
            e.Property(r => r.GeneralHealthScore).HasPrecision(3, 1);
        });

        modelBuilder.Entity<SafehouseMonthlyMetric>(e =>
        {
            e.Property(m => m.AvgEducationProgress).HasPrecision(5, 2);
            e.Property(m => m.AvgHealthScore).HasPrecision(3, 1);
        });

        modelBuilder.Entity<InterventionPlan>(e =>
            e.Property(p => p.TargetValue).HasPrecision(14, 2));

        modelBuilder.Entity<PredictionResult>(e =>
            e.Property(p => p.Score).HasPrecision(6, 4));

        // Indexes
        modelBuilder.Entity<SupporterUserLink>()
            .HasIndex(l => new { l.SupporterId, l.UserId })
            .IsUnique();

        modelBuilder.Entity<Resident>()
            .HasIndex(r => r.CaseControlNo)
            .IsUnique();

        ApplySnakeCaseColumnConvention(modelBuilder);

        // Override columns where the auto snake_case doesn't match the actual DB column name.
        // family_is_4ps converts to family_is4_ps via snake_case, and the health table uses
        // legacy names that differ from the property names used by the app/services.
        modelBuilder.Model.FindEntityType(typeof(Resident))
            ?.FindProperty(nameof(Resident.FamilyIs4Ps))
            ?.SetColumnName("family_is_4ps");

        var healthEntity = modelBuilder.Model.FindEntityType(typeof(HealthWellbeingRecord));
        healthEntity?.FindProperty(nameof(HealthWellbeingRecord.SleepScore))
            ?.SetColumnName("sleep_quality_score");
        healthEntity?.FindProperty(nameof(HealthWellbeingRecord.EnergyScore))
            ?.SetColumnName("energy_level_score");
        healthEntity?.FindProperty(nameof(HealthWellbeingRecord.MedicalNotesRestricted))
            ?.SetColumnName("notes");

    }

    private static void ApplySnakeCaseColumnConvention(ModelBuilder modelBuilder)
    {
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var property in entityType.GetProperties())
            {
                property.SetColumnName(ToSnakeCase(property.Name));
            }
        }
    }

    private static string ToSnakeCase(string value)
    {
        if (string.IsNullOrEmpty(value))
            return value;

        var builder = new StringBuilder(value.Length + 8);

        for (var i = 0; i < value.Length; i++)
        {
            var c = value[i];
            if (char.IsUpper(c))
            {
                var hasPrevious = i > 0;
                var hasNext = i + 1 < value.Length;
                var nextIsLower = hasNext && char.IsLower(value[i + 1]);
                var previousIsLowerOrDigit = hasPrevious && (char.IsLower(value[i - 1]) || char.IsDigit(value[i - 1]));

                if (previousIsLowerOrDigit || (hasPrevious && nextIsLower))
                    builder.Append('_');

                builder.Append(char.ToLowerInvariant(c));
            }
            else
            {
                builder.Append(c);
            }
        }

        return builder.ToString();
    }
}
