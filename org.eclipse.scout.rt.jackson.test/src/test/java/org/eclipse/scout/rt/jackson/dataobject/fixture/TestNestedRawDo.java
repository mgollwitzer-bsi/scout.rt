/*
 * Copyright (c) 2010, 2023 BSI Business Systems Integration AG
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package org.eclipse.scout.rt.jackson.dataobject.fixture;

import javax.annotation.Generated;

import org.eclipse.scout.rt.dataobject.DoEntity;
import org.eclipse.scout.rt.dataobject.DoValue;
import org.eclipse.scout.rt.dataobject.IDataObject;
import org.eclipse.scout.rt.dataobject.IDoEntity;
import org.eclipse.scout.rt.dataobject.TypeName;

@TypeName("TestNestedRaw")
public class TestNestedRawDo extends DoEntity {

  public DoValue<DoEntity> doEntity() {
    return doValue("doEntity");
  }

  public DoValue<IDoEntity> iDoEntity() {
    return doValue("iDoEntity");
  }

  public DoValue<IDataObject> iDataObject() {
    return doValue("iDataObject");
  }

  public DoValue<ITestTypedUntypedInnerDo> iTestTypedUntypedInner() {
    return doValue("iTestTypedUntypedInner");
  }

  public DoValue<ITestTypedUntypedInnerDataObjectDo> iTestTypedUntypedInnerDataObject() {
    return doValue("iTestTypedUntypedInnerDataObject");
  }

  public DoValue<AbstractTestTypedUntypedInnerDo> abstractTestTypedUntypedInner() {
    return doValue("abstractTestTypedUntypedInner");
  }

  /* **************************************************************************
   * GENERATED CONVENIENCE METHODS
   * *************************************************************************/

  @Generated("DoConvenienceMethodsGenerator")
  public TestNestedRawDo withDoEntity(DoEntity doEntity) {
    doEntity().set(doEntity);
    return this;
  }

  @Generated("DoConvenienceMethodsGenerator")
  public DoEntity getDoEntity() {
    return doEntity().get();
  }

  @Generated("DoConvenienceMethodsGenerator")
  public TestNestedRawDo withIDoEntity(IDoEntity iDoEntity) {
    iDoEntity().set(iDoEntity);
    return this;
  }

  @Generated("DoConvenienceMethodsGenerator")
  public IDoEntity getIDoEntity() {
    return iDoEntity().get();
  }

  @Generated("DoConvenienceMethodsGenerator")
  public TestNestedRawDo withIDataObject(IDataObject iDataObject) {
    iDataObject().set(iDataObject);
    return this;
  }

  @Generated("DoConvenienceMethodsGenerator")
  public IDataObject getIDataObject() {
    return iDataObject().get();
  }

  @Generated("DoConvenienceMethodsGenerator")
  public TestNestedRawDo withITestTypedUntypedInner(ITestTypedUntypedInnerDo iTestTypedUntypedInner) {
    iTestTypedUntypedInner().set(iTestTypedUntypedInner);
    return this;
  }

  @Generated("DoConvenienceMethodsGenerator")
  public ITestTypedUntypedInnerDo getITestTypedUntypedInner() {
    return iTestTypedUntypedInner().get();
  }

  @Generated("DoConvenienceMethodsGenerator")
  public TestNestedRawDo withITestTypedUntypedInnerDataObject(ITestTypedUntypedInnerDataObjectDo iTestTypedUntypedInnerDataObject) {
    iTestTypedUntypedInnerDataObject().set(iTestTypedUntypedInnerDataObject);
    return this;
  }

  @Generated("DoConvenienceMethodsGenerator")
  public ITestTypedUntypedInnerDataObjectDo getITestTypedUntypedInnerDataObject() {
    return iTestTypedUntypedInnerDataObject().get();
  }

  @Generated("DoConvenienceMethodsGenerator")
  public TestNestedRawDo withAbstractTestTypedUntypedInner(AbstractTestTypedUntypedInnerDo abstractTestTypedUntypedInner) {
    abstractTestTypedUntypedInner().set(abstractTestTypedUntypedInner);
    return this;
  }

  @Generated("DoConvenienceMethodsGenerator")
  public AbstractTestTypedUntypedInnerDo getAbstractTestTypedUntypedInner() {
    return abstractTestTypedUntypedInner().get();
  }
}
