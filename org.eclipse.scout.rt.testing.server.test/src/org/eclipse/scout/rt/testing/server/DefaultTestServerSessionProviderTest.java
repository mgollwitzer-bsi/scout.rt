/*******************************************************************************
 * Copyright (c) 2014 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
package org.eclipse.scout.rt.testing.server;

import static org.junit.Assert.assertTrue;
import static org.mockito.Mockito.verify;

import javax.security.auth.Subject;

import org.eclipse.scout.commons.exception.ProcessingException;
import org.eclipse.scout.rt.platform.cdi.internal.BeanInstanceCreator;
import org.eclipse.scout.rt.testing.platform.ScoutPlatformTestRunner;
import org.eclipse.scout.rt.testing.server.test.TestServerSession;
import org.junit.Ignore;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.Mockito;

/**
 * Test for {@link DefaultTestServerSessionProvider}
 */
@RunWith(ScoutPlatformTestRunner.class)
public class DefaultTestServerSessionProviderTest {

  /**
   * A new ServerSession should be created and loaded in
   * {@link DefaultTestServerSessionProvider#createServerSession(Class, Subject)}
   *
   * @throws ProcessingException
   */
  //TODO aho this test fails since the introduction of the new services
  @Ignore
  @Test
  public void testCreateServerSession() throws ProcessingException {
    DefaultTestServerSessionProvider serverSessionProvider = BeanInstanceCreator.createAndInitialize(DefaultTestServerSessionProvider.class);
    final DefaultTestServerSessionProvider d = Mockito.spy(serverSessionProvider);
    final Subject subject = new Subject();
    final TestServerSession session = d.createServerSession(TestServerSession.class, subject);
    assertTrue(session.isActive());
    verify(d, Mockito.times(1)).afterStartSession(session, subject);
    verify(d, Mockito.times(1)).beforeStartSession(session, subject);
  }
}
