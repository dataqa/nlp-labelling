from marshmallow_sqlalchemy import (fields,
                                    SQLAlchemyAutoSchema)

from .models import (ClassificationProject,
                     ClassificationRule,
                     EntityDisambiguationProject,
                     NERRule,
                     NERProject,
                     SupervisedClass)


class EntityDisambiguationSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = EntityDisambiguationProject
        include_relationships = True
        load_instance = True


class SupervisedClassSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = SupervisedClass
        load_instance = True


class ClassificationProjectSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = ClassificationProject
        include_relationships = True
        load_instance = True

    # Override classes field to use a nested representation rather than pks
    classes = fields.Nested(SupervisedClassSchema, many=True)


class ClassificationRuleSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = ClassificationRule
        include_relationships = True
        load_instance = True


class NERProjectSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = NERProject
        include_relationships = True
        load_instance = True

    # Override classes field to use a nested representation rather than pks
    classes = fields.Nested(SupervisedClassSchema, many=True)


class NERRuleSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = NERRule
        include_relationships = True
        load_instance = True
