/*
 * Copyright (c) 2010, 2023 BSI Business Systems Integration AG
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package org.eclipse.scout.rt.rest.jersey.server;

import org.eclipse.scout.rt.jackson.dataobject.JacksonIdEncryptionDataObjectMapper;
import org.eclipse.scout.rt.platform.BEANS;
import org.eclipse.scout.rt.rest.container.IRestContainerRequestFilter;
import org.eclipse.scout.rt.rest.container.IRestContainerResponseFilter;
import org.glassfish.jersey.jackson.internal.jackson.jaxrs.cfg.EndpointConfigBase;
import org.glassfish.jersey.jackson.internal.jackson.jaxrs.cfg.ObjectReaderInjector;
import org.glassfish.jersey.jackson.internal.jackson.jaxrs.cfg.ObjectReaderModifier;
import org.glassfish.jersey.jackson.internal.jackson.jaxrs.cfg.ObjectWriterInjector;
import org.glassfish.jersey.jackson.internal.jackson.jaxrs.cfg.ObjectWriterModifier;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.JavaType;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.ObjectReader;
import com.fasterxml.jackson.databind.ObjectWriter;

import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerResponseContext;
import jakarta.ws.rs.core.MultivaluedMap;

public class IdEncryptionRestContainerFilter implements IRestContainerRequestFilter, IRestContainerResponseFilter {

  @Override
  public void filter(ContainerRequestContext requestContext) {
    ObjectReaderInjector.set(new IdEncryptionObjectReaderModifier());
  }

  @Override
  public void filter(ContainerRequestContext requestContext, ContainerResponseContext responseContext) {
    ObjectReaderInjector.set(new IdEncryptionObjectReaderModifier());
    ObjectWriterInjector.set(new IdEncryptionObjectWriterModifier());
  }

  public static class IdEncryptionObjectReaderModifier extends ObjectReaderModifier {

    @Override
    public ObjectReader modify(EndpointConfigBase<?> endpoint, MultivaluedMap<String, String> httpHeaders, JavaType resultType, ObjectReader r, JsonParser p) {
      //noinspection deprecation
      ObjectMapper objectMapper = BEANS.get(JacksonIdEncryptionDataObjectMapper.class).getObjectMapper();
      p.setCodec(objectMapper);
      return objectMapper.readerFor(r.getValueType());
    }
  }

  public static class IdEncryptionObjectWriterModifier extends ObjectWriterModifier {

    @Override
    public ObjectWriter modify(EndpointConfigBase<?> endpoint, MultivaluedMap<String, Object> responseHeaders, Object valueToWrite, ObjectWriter w, JsonGenerator g) {
      //noinspection deprecation
      ObjectMapper objectMapper = BEANS.get(JacksonIdEncryptionDataObjectMapper.class).getObjectMapper();
      g.setCodec(objectMapper);
      return objectMapper.writer();
    }
  }
}
