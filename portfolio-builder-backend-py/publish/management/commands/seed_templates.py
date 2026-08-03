from django.core.management.base import BaseCommand

from publish.models import Template
from publish.seeds import SEEDS


class Command(BaseCommand):
    help = "Upsert Template rows from publish.seeds.SEEDS and prune any rows no longer listed there."

    def handle(self, *args, **options):
        seeded_slugs = set()
        for seed in SEEDS:
            defaults = {k: v for k, v in seed.items() if k != "slug"}
            _, created = Template.objects.update_or_create(slug=seed["slug"], defaults=defaults)
            seeded_slugs.add(seed["slug"])
            self.stdout.write(f"{'Created' if created else 'Updated'} template: {seed['slug']}")

        deleted, _ = Template.objects.exclude(slug__in=seeded_slugs).delete()
        if deleted:
            self.stdout.write(f"Pruned {deleted} template(s) no longer in SEEDS")
