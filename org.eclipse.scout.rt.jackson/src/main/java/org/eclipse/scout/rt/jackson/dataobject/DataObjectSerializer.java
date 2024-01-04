/*
 * Copyright (c) 2010, 2023 BSI Business Systems Integration AG
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package org.eclipse.scout.rt.jackson.dataobject;

import java.io.IOException;

import org.eclipse.scout.rt.dataobject.IDataObject;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.JavaType;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.SerializerProvider;
import com.fasterxml.jackson.databind.ser.std.StdSerializer;

/**
 * Generic serializer for {@link IDataObject} delegating to {@link DoEntitySerializer} / {@link DoCollectionSerializer}
 * according to content.
 */
public class DataObjectSerializer extends StdSerializer<IDataObject> {
  private static final long serialVersionUID = 1L;

  public DataObjectSerializer(ScoutDataObjectModuleContext context, JavaType type) {
    super(type);
  }

  @Override
  public void serialize(IDataObject value, JsonGenerator gen, SerializerProvider provider) throws IOException {
    // delegate to value-based derived serializer
    JsonSerializer<Object> ser = provider.findTypedValueSerializer(value.getClass(), true, null);
    ser.serialize(value, gen, provider);
  }
}
