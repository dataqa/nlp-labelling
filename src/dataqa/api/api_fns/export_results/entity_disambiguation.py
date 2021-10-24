import csv
import io
from sqlalchemy.sql import and_

from dataqa.db import models as models


def export_labels(project, session):
    """
    Export a csv with the normalised spans to knowledge base id and text.
    """
    mapping = session.query(models.EntityDisambiguationMapping,
                            models.EntityDisambiguationKB) \
        .filter(models.EntityDisambiguationMapping.kb_id == models.EntityDisambiguationKB.id) \
        .filter(and_(models.EntityDisambiguationMapping.kb_id != None,
                     models.EntityDisambiguationMapping.project_id == project.id))

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["normalised_text", "kb_id", "kb_text"])

    for row in mapping:
        writer.writerow([row.EntityDisambiguationMapping.normalised_text,
                         row.EntityDisambiguationKB.id,
                         row.EntityDisambiguationKB.name])

    return output
