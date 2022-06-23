from django.contrib import admin
from annotateapp.models import Document, Project, Rule, Regex, DocumentLabel


class ProjectAdmin(admin.ModelAdmin):
    prepopulated_fields = {"slug": ("name",)}


class RuleAdmin(admin.ModelAdmin):
    prepopulated_fields = {"slug": ("name",)}

    def formfield_for_choice_field(self, db_field, request, **kwargs):
        if db_field.name == "rule_engine":
            kwargs["choices"] = (
                ("accepted", "Accepted"),
                ("denied", "Denied"),
            )
            if request.user.is_superuser:
                kwargs["choices"] += (("ready", "Ready for deployment"),)
        return super().formfield_for_choice_field(db_field, request, **kwargs)


admin.site.register(Project, ProjectAdmin)
admin.site.register(Rule, RuleAdmin)
admin.site.register(Document)
admin.site.register(Regex)
admin.site.register(DocumentLabel)
