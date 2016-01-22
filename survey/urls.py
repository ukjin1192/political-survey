# -*- coding: utf-8 -*-

from django.conf import settings
from django.conf.urls import include, url
from django.contrib import admin
from django.views.generic import TemplateView


admin.autodiscover()

urlpatterns = [
    # Admin
    url(
        r'^admin/', 
        include(admin.site.urls)
    ),
    # API end points
    url(
        r'^api/', 
        include('main.urls')
    ),
    # Captcha for human validation
    url(
        r'^captcha/', 
        include('captcha.urls')
    ),
    # Front-end pages
    url(
        r'^$', 
        TemplateView.as_view(template_name='index.html')
    ),
    url(
        r'^result/(?P<pk>[0-9]+)/$', 
        TemplateView.as_view(template_name='result.html')
    ),
]

if settings.RUN_SILK:
    urlpatterns += [
        # Inspection tool
        url(
            r'^silk/', 
            include('silk.urls', namespace='silk')
        ),
    ]
