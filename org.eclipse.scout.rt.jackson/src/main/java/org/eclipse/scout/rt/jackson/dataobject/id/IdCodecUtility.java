/*
 * Copyright (c) 2010, 2023 BSI Business Systems Integration AG
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package org.eclipse.scout.rt.jackson.dataobject.id;

import static java.util.Collections.*;

import java.util.Collection;
import java.util.Set;

import org.eclipse.scout.rt.dataobject.id.IdCodec.IIdCodecFlag;
import org.eclipse.scout.rt.dataobject.id.IdCodec.IdCodecFlag;
import org.eclipse.scout.rt.jackson.dataobject.ScoutDataObjectModuleContext;
import org.eclipse.scout.rt.platform.util.CollectionUtility;

public final class IdCodecUtility {

  private IdCodecUtility() {
  }

  public static Collection<IIdCodecFlag> getIdCodecFlags(ScoutDataObjectModuleContext moduleContext) {
    if (moduleContext == null) {
      return emptySet();
    }
    Set<IIdCodecFlag> flags = CollectionUtility.emptyHashSet();
    if (moduleContext.isIdEncryption()) {
      flags.add(IdCodecFlag.ENCRYPTION);
    }
    return unmodifiableSet(flags);
  }
}
