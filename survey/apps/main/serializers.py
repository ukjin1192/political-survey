#!usr/bin/python
# -*- coding: utf-8 -*-

from main.models import User, ComparisonTarget, Survey, Question, Choice, Answer, Result, RotationMatrix, VoiceOfCustomer
from rest_framework import serializers


class UserSerializer(serializers.HyperlinkedModelSerializer):

    class Meta:
        model = User
        fields = ('id', 'sex', 'year_of_birth', 'political_tendency', 'supporting_party')


class ComparisonTargetSerializer(serializers.HyperlinkedModelSerializer):
    survey = serializers.ReadOnlyField(source='survey.id')

    class Meta:
        model = ComparisonTarget
        fields = ('id', 'survey', 'name', 'color', 'is_reliable')


class SurveySerializer(serializers.HyperlinkedModelSerializer):

    class Meta:
        model = Survey
        fields = ('id', 'title')


class QuestionSerializer(serializers.HyperlinkedModelSerializer):
    survey = serializers.ReadOnlyField(source='survey.id')
    choices = serializers.SerializerMethodField()

    class Meta:
        model = Question
        fields = ('id', 'survey', 'title', 'subtitle', 'explanation', 'cheating_paper', 'image_url', 'duration_limit', 'is_economic_bill', 'factor_reversed', 'choices')

    def get_choices(self, obj):
        """
        Get all choices in specific question
        """
        choices = Choice.objects.filter(question=obj)
        # serializer = ChoiceSerializer(choices, many=True, context={'request': self.context['request']})
        serializer = ChoiceSerializer(choices, many=True)
        return serializer.data


class ChoiceSerializer(serializers.HyperlinkedModelSerializer):
    question = serializers.ReadOnlyField(source='question.id')

    class Meta:
        model = Choice
        fields = ('id', 'question', 'context', 'factor')


class AnswerSerializer(serializers.HyperlinkedModelSerializer):
    user = serializers.ReadOnlyField(source='user.id')
    choice = serializers.ReadOnlyField(source='choice.id')

    class Meta:
        model = Answer
        fields = ('id', 'user', 'choice', 'updated_at')


class ResultSerializer(serializers.HyperlinkedModelSerializer):
    user = serializers.ReadOnlyField(source='user.id')
    survey = serializers.ReadOnlyField(source='survey.id')

    class Meta:
        model = Result
        fields = ('id', 'user', 'survey', 'record', 'expected_target', 'category', 'x_axis_name', 'y_axis_name', 'is_public', 'updated_at')


class VoiceOfCustomerSerializer(serializers.HyperlinkedModelSerializer):
    author = serializers.ReadOnlyField(source='author.id')
    survey = serializers.ReadOnlyField(source='survey.id')

    class Meta:
        model = VoiceOfCustomer
        fields = ('id', 'author', 'survey', 'context', 'checked', 'created_at')
